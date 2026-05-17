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
	parentContextId: null | number;
	phase: PhaseLabel;
	start: number;
}

interface TrackOptions {
	clearAfter?: boolean;
}

class FeaturePerformanceTracker {
	private activeContextId = 0;
	private contexts = new Map<number, TrackContext>();
	private contextStack: number[] = [];
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
	logSummary(str?: string) {
		const { enabled, metrics } = this;

		if (!enabled || !metrics.length) return;

		// For total, sum only the root-level (depth 0) operations - they include all nested time
		const rootMetrics = metrics.filter((m) => m.depth === 0);
		const total = rootMetrics.reduce((sum, m) => sum + m.duration, 0);
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

	async track<T>(id: PerfId, phase: Phase, fn: () => MaybePromise<T>, subPhase?: SubPhase, options?: TrackOptions): Promise<T> {
		const { contexts, contextStack, enabled, MAX_METRICS, metrics } = this;

		if (!enabled) return await fn();

		const contextId = ++this.activeContextId;
		const start = performance.now();
		const label: PhaseLabel = subPhase ? `${phase}:${subPhase}` : phase;
		const stackTrace = DEV_MODE ? new Error().stack?.split("\n").slice(1, 4).join("\n") : undefined;

		// Determine effective parent — only same-feature context qualifies
		const stackTopId = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
		const stackTopContext = stackTopId ? contexts.get(stackTopId) : null;
		const parentContextId = stackTopContext && stackTopContext.id === id ? stackTopId : null;
		const depth = parentContextId ? stackTopContext!.depth + 1 : 0;

		const { length: savedStackLen } = contextStack;

		contextStack.push(contextId);
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

			// Restore stack to the length it was on entry (handles out-of-order concurrent completion)
			while (contextStack.length > savedStackLen) {
				contextStack.pop();
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

				this.record(id, label, duration, exclusiveDuration, contextDepth, { callStack: stackTrace });
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
		const { contexts, contextStack, enabled } = this;

		if (!enabled) return;

		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
		const contextsToDelete: number[] = [];

		for (const [contextId, context] of contexts.entries()) {
			if (context.start < fiveMinutesAgo && !contextStack.includes(contextId)) contextsToDelete.push(contextId);
		}
		for (const contextId of contextsToDelete) {
			contexts.delete(contextId);
		}
	}

	private record(
		id: PerfId,
		phase: PhaseLabel,
		duration: number,
		exclusiveDuration: number,
		depth: number,
		context?: { callStack?: string; errorContext?: Nullable<{ error: unknown; featureId: PerfId; operation: string }> }
	) {
		const { metrics } = this;

		metrics.push({
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
