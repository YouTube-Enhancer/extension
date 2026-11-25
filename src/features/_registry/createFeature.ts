import type { FeatureBase, FeatureKeys } from "@/src/features/_registry/types";

/**
 * Typed identity wrapper — the feature contract's type home. KEEP (maintainer decision,
 * 2026-11-15); the "delete this noise" review is answered here so the question is not re-opened
 * without new information.
 *
 * `FeatureBase<K>` carries `K`, the feature's own key, so wrapping a feature literal with
 * `createFeature({...})` pins `K` from the literal and flows it into every lifecycle callback's
 * `config` parameter (`onEnable(config)`, `onDisable(config)`, `onConfigChange(config)`) without
 * the author writing a type argument or a `satisfies` at each callback. The wrapper adds no
 * runtime behaviour — it is erased — but it is the single place that inference happens.
 *
 * Why not delete it: 55 feature files import it (one per true feature, plus the css-toggle and
 * button factories that route through it). Removing it means either re-annotating each of those
 * 55 call sites with an explicit type parameter, or letting `config` fall back to an untyped /
 * widened annotation across the whole feature surface. Both are churn with no behaviour gain,
 * and the partial adoption the mechanical sweep would inevitably leave behind is worse than the
 * indirection. AGENTS.md's feature contract already documents the wrapper as required, so
 * deleting it would also desync the contract from the code.
 *
 * If a future review wants this gone, the honest cost is: 55 files, a contract doc update, and a
 * decision about where typed `config` lives instead. That is a separate plan, not a cleanup.
 */
export function createFeature<K extends FeatureKeys>(feature: FeatureBase<K>): FeatureBase<K> {
	return feature;
}
