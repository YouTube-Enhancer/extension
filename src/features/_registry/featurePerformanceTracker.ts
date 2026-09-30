import type { FeatureKeys } from "@/src/features/_registry/types";
import type { MaybePromise, Nullable } from "@/src/types";

import { DEV_MODE } from "@/src/utils/config/env";

export type FeatureError = {
	error: unknown;
	id: PerfId;
	operation: string;
	timestamp: number;
};

export type FeatureMetric = {
	// Enhanced debugging context
	callStack?: string;
	/** Group ID for parallel execution. Features in different groups run concurrently. */
	concurrencyGroup?: number;
	depth: number;
	duration: number;
	errorContext?: Nullable<{
		error: unknown;
		featureId: PerfId;
		operation: string;
	}>;
	exclusiveDuration: number;
	id: PerfId;
	phase: PhaseLabel;
	timestamp: number;
};
export type PerfId = FeatureKeys | (string & {});
export type Phase = "buttons" | "config" | "disable" | "enable" | "error" | "init" | "navigate";
export type PhaseLabel = `${Phase}:${SubPhase}` | Phase;
export type SubPhase = "buttons" | "callback" | "dependencies" | "lifecycle" | "state";

interface TrackContext {
	childDuration: number;
	contextId: number;
	depth: number;
	id: PerfId;
	parentContextId: Nullable<number>;
	phase: PhaseLabel;
	start: number;
}

interface TrackOptions {
	clearAfter?: boolean;
}

class FeaturePerformanceTracker {
	private activeContextId = 0;
	private captureStackTraces = false;
	private contexts = new Map<number, TrackContext>();
	/** Per-feature context stacks. Each feature gets its own isolated stack so concurrent features don't interfere. */
	private contextStacks = new Map<PerfId, number[]>();
	private enabled = DEV_MODE;
	private errors: FeatureError[] = [];
	private MAX_METRICS = 50000;
	private metrics: FeatureMetric[] = [];

	constructor() {
		if (DEV_MODE) {
			(window as unknown as Window & { featurePerformanceTracker: FeaturePerformanceTracker }).featurePerformanceTracker = this;
		}
	}
	static serializeError(error: unknown, depth = 0): unknown {
		if (depth > 5) return String(error);
		if (error instanceof Error) {
			return {
				cause: error.cause ? FeaturePerformanceTracker.serializeError(error.cause, depth + 1) : undefined,
				message: error.message,
				name: error.name,
				stack: error.stack
			};
		}
		return error;
	}
	clear() {
		const { enabled } = this;

		if (!enabled) return;
		this.metrics = [];

		console.log(`[FeaturePerf] Metrics cleared (${this.metrics.length} entries)`);
	}

	getErrors() {
		const { enabled, errors } = this;

		return enabled ? errors : [];
	}
	getMetrics() {
		const { enabled, metrics } = this;

		return enabled ? metrics : [];
	}
	getSlowest(limit = 10) {
		const { enabled, metrics } = this;

		if (!enabled) return [];

		return [...metrics].sort((a, b) => b.exclusiveDuration - a.exclusiveDuration).slice(0, limit);
	}

	isEnabled(): boolean {
		const { enabled } = this;

		return enabled;
	}
	/** Toggle stack trace capture. Off by default even in DEV_MODE to avoid ~345 Error allocations per page load. */
	setCaptureStackTraces(capture: boolean): void {
		this.captureStackTraces = capture;
	}
	logSummary(str?: string) {
		const { enabled, metrics } = this;

		if (!enabled || !metrics.length) return;

		// Calculate wall-clock time from concurrency groups:
		// Features in the same group run sequentially (sum durations).
		// Features in different groups run in parallel (take max within each group, then sum across groups).
		const rootMetrics = metrics.filter((m) => m.depth === 0);
		const groups = new Map<number, number>();
		for (const m of rootMetrics) {
			const group = m.concurrencyGroup ?? 0;
			const current = groups.get(group) ?? 0;
			// For parallel groups, take max; for sequential groups (or no group), take sum
			// Since all features use the same group in parallel mode, we take max within each group
			groups.set(group, Math.max(current, m.duration));
		}
		const total = Array.from(groups.values()).reduce((sum, groupDuration) => sum + groupDuration, 0);
		const byPhase: Record<string, FeatureMetric[]> = {};

		for (const m of metrics) (byPhase[m.phase] ??= []).push(m);
		console.group("[FeaturePerf] Summary", " ", str ?? "");
		console.log(`Total tracked time: ${total.toFixed(2)}ms`);
		console.log(`Metrics count: ${metrics.length}`);
		for (const [phase, phaseMetrics] of Object.entries(byPhase)) {
			const phaseExclusive = phaseMetrics.reduce((s, m) => s + m.exclusiveDuration, 0);
			const phaseChildren = phaseMetrics.reduce((s, m) => s + m.duration, 0) - phaseExclusive;
			const hasChildren = phaseChildren > 0.01;
			const childInfo = hasChildren ? ` (${phaseChildren.toFixed(2)}ms children)` : "";

			console.log(`- ${phase}: ${phaseMetrics.length} calls, ${phaseExclusive.toFixed(2)}ms excl.${childInfo}`);
		}
		console.table(this.getSlowest(10));
		console.groupEnd();
	}
	recordError(id: PerfId, operation: string, error: unknown) {
		const { enabled, errors } = this;

		if (!enabled) return;

		const serializedError = FeaturePerformanceTracker.serializeError(error);

		errors.push({
			error: serializedError,
			id,
			operation,
			timestamp: Date.now()
		});
		if (errors.length > 100) {
			errors.shift();
		}
		this.record(id, "error", 0, 0, 0, {
			errorContext: {
				error: serializedError,
				featureId: id,
				operation
			}
		});
		console.warn(`[FeaturePerf] Error in ${String(id)} during ${operation}:`, error);
	}

	async track<T>(
		id: PerfId,
		phase: Phase,
		fn: () => MaybePromise<T>,
		subPhase?: SubPhase,
		options?: TrackOptions & { concurrencyGroup?: number }
	): Promise<T> {
		const { contexts, enabled, MAX_METRICS, metrics } = this;

		if (!enabled) return await fn();

		// Each feature gets its own isolated stack — concurrent features don't interfere
		const stack = this.getStack(id);

		const contextId = ++this.activeContextId;
		const start = performance.now();
		const label: PhaseLabel = subPhase ? `${phase}:${subPhase}` : phase;
		const stackTrace = this.captureStackTraces ? new Error().stack?.split("\n").slice(1, 4).join("\n") : undefined;

		// Determine effective parent — only same-feature context qualifies
		const stackTopId = stack.length > 0 ? stack[stack.length - 1] : null;
		const stackTopContext = stackTopId ? contexts.get(stackTopId) : null;
		const parentContextId = stackTopContext && stackTopContext.id === id ? stackTopId : null;
		const depth = parentContextId ? stackTopContext!.depth + 1 : 0;

		const { length: savedStackLen } = stack;

		stack.push(contextId);
		contexts.set(contextId, {
			childDuration: 0,
			contextId,
			depth,
			id,
			parentContextId,
			phase: label,
			start
		});
		try {
			return await fn();
		} catch (error) {
			this.recordError(id, `${String(phase)}${subPhase ? `:${subPhase}` : ""}`, error);
			throw error;
		} finally {
			const end = performance.now();
			const duration = end - start;

			// Restore this feature's stack to the length it was on entry
			while (stack.length > savedStackLen) {
				stack.pop();
			}

			const context = contexts.get(contextId);

			if (context) {
				const { childDuration, depth: contextDepth, parentContextId: contextParentContextId } = context;

				if (contextParentContextId) {
					const parentContext = contexts.get(contextParentContextId);

					if (parentContext) {
						parentContext.childDuration += duration;
					}
				}
				const exclusiveDuration = duration - childDuration;

				this.record(id, label, duration, exclusiveDuration, contextDepth, { callStack: stackTrace, concurrencyGroup: options?.concurrencyGroup });
				contexts.delete(contextId);
			}

			this.cleanupOldContexts();
			if (options?.clearAfter) this.clear();
			else if (metrics.length > MAX_METRICS) {
				console.warn(`[FeaturePerf] Metrics exceeded ${MAX_METRICS}, auto-clearing`);
				this.clear();
			}
		}
	}

	/**
	 * Cleanup old contexts to prevent memory leaks in long-running sessions
	 * Removes contexts that haven't been accessed in the last 5 minutes
	 */
	private cleanupOldContexts(): void {
		const { contexts, contextStacks, enabled } = this;

		if (!enabled) return;

		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
		const contextsToDelete: number[] = [];

		for (const [contextId, context] of contexts.entries()) {
			if (context.start >= fiveMinutesAgo) continue;
			// Check if this context is on any feature's stack
			const stack = contextStacks.get(context.id);
			if (stack && stack.includes(contextId)) continue;
			contextsToDelete.push(contextId);
		}
		for (const contextId of contextsToDelete) {
			contexts.delete(contextId);
		}
	}

	/** Get or create the context stack for a specific feature. */
	private getStack(id: PerfId): number[] {
		let stack = this.contextStacks.get(id);
		if (!stack) {
			stack = [];
			this.contextStacks.set(id, stack);
		}
		return stack;
	}

	private record(
		id: PerfId,
		phase: PhaseLabel,
		duration: number,
		exclusiveDuration: number,
		depth: number,
		context?: { callStack?: string; concurrencyGroup?: number; errorContext?: Nullable<{ error: unknown; featureId: PerfId; operation: string }> }
	) {
		const { metrics } = this;

		metrics.push({
			concurrencyGroup: context?.concurrencyGroup,
			depth,
			duration,
			exclusiveDuration,
			id,
			phase,
			timestamp: Date.now(),
			// Include context when provided
			...(context ?? {})
		});
		if (exclusiveDuration > 100) {
			console.warn(`[FeaturePerf] ${id} ${phase} took ${exclusiveDuration.toFixed(2)}ms`);
		}
	}
}

export const featurePerformanceTracker = new FeaturePerformanceTracker();
