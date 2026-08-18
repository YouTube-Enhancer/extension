/**
 * Ensures the Trusted Types "default" policy exists.
 * Only creates the policy when `window.trustedTypes` is available and no default policy is set yet.
 * Should be called from feature lifecycle methods (e.g. `onEnable`) so that the policy is not created
 * eagerly during bundle evaluation.
 */
export function ensureTrustedTypesPolicy(): void {
	const { trustedTypes } = window;
	if (!trustedTypes || trustedTypes.defaultPolicy) return;
	trustedTypes.createPolicy("default", {
		createHTML: (input: string) => input
	});
}
