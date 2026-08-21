/**
 * Ensures the Trusted Types "default" policy exists.
 * Only creates the policy when `window.trustedTypes` is available and no default policy is set yet.
 * Called once during embedded setup (see `setupYouTubePage`) so all features can safely use HTML sinks
 * on pages that enforce Trusted Types, without creating the policy eagerly during bundle evaluation.
 */
export function ensureTrustedTypesPolicy(): void {
	const { trustedTypes } = window;
	if (!trustedTypes || trustedTypes.defaultPolicy) return;
	trustedTypes.createPolicy("default", {
		createHTML: (input: string) => input
	});
}
