import type { FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import type { PerfId, Phase, SubPhase } from "./featurePerformanceTracker";

import { featurePerformanceTracker } from "./featurePerformanceTracker";

/**
 * Base class for feature registry managers that provides common error logging functionality.
 */
export abstract class FeatureManagerBase {
	private perf = featurePerformanceTracker;
	/**
	 * Subclasses must override this to provide a specific feature ID for error logging.
	 */
	protected abstract getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState;

	protected logErrorToTracker(operation: string, error: unknown): void {
		// Try to get a feature ID from context if possible, otherwise use a generic identifier
		// This is designed to be overridden by subclasses if they have a specific feature ID
		const featureId = this.getFeatureIdForErrorLogging();

		if (featurePerformanceTracker.isEnabled()) {
			featurePerformanceTracker.recordError(featureId, operation, error);
		}
		console.error(`Error in ${operation}:`, error);
	}

	/**
	 * Safely executes an async operation, automatically logging errors and optionally tracking timing via the performance tracker.
	 *
	 * @param id - Feature ID or string identifier for error tracking
	 * @param operation - Description of the operation for error logging (format: "phase:subPhase" or just "phase")
	 * @param fn - The async operation to execute
	 * @param options - Configuration options
	 * @param options.fallback - Value to return if the operation fails (optional)
	 * @param options.shouldRethrow - Whether to rethrow the error after logging (default: false)
	 * @param options.trackTiming - Whether to track execution timing (default: true)
	 * @param options.subPhase - Optional sub-phase for more detailed timing tracking (overrides operation subPhase)
	 * @returns The operation result, or the fallback value if provided and operation fails
	 */
	protected async safelyExecute<T>(
		id: PerfId,
		operation: string,
		fn: () => Promise<T>,
		options: {
			fallback?: T;
			shouldRethrow?: boolean;
			subPhase?: string;
			trackTiming?: boolean;
		} = {}
	): Promise<Nullable<T>> {
		const shouldTrackTiming = options.trackTiming !== false;

		// Parse operation string to extract phase and subPhase
		const [basePhase, baseSubPhase] = operation.split(":");
		const phase = basePhase as Phase;
		const subPhaseFromOperation = baseSubPhase as SubPhase | undefined;

		// Use options.subPhase if provided, otherwise use subPhase from operation string
		const finalSubPhase = options.subPhase ?? subPhaseFromOperation;

		if (shouldTrackTiming) {
			// Delegate to performance tracker for timing and error handling
			return await this.perf.track<T>(id, phase, fn, finalSubPhase as SubPhase);
		} else {
			// Just error handling without timing tracking
			try {
				return await fn();
			} catch (error) {
				// Construct operation string for error recording
				const operationString = finalSubPhase ? `${operation}${options.subPhase ? "" : `:${finalSubPhase}`}` : operation;

				this.perf.recordError(id, operationString, error);

				if (options.shouldRethrow) {
					throw error;
				}

				return options.fallback ?? null;
			}
		}
	}
}
