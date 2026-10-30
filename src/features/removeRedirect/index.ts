import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { subscribeToDomMutations } from "@/src/utils/dom/observers/domMutationBus";
import { browserColorLog } from "@/src/utils/logging";

import { metadata } from "./index.metadata";
import {
	attachFrameUnwrapping,
	detachFrameUnwrapping,
	REDIRECT_LINK_SELECTOR,
	unwrapRedirectElements,
	unwrapRedirectsIn
} from "./utils";

let unsubscribeBus: Nullable<() => void> = null;

export default createFeature({
	...metadata,
	onDisable: () => {
		browserColorLog(`Disabling removeRedirect`, "FgMagenta");
	},
	onEnable: () => {
		browserColorLog(`Enabling removeRedirect`, "FgMagenta");
		unsubscribeBus?.();
		unwrapRedirectsIn(document);
		// Narrow AND deep. The jank a bare `[href]` subscription caused during sidebar
		// churn was its delivery volume — every thumbnail link matched and was processed —
		// not the descendant scan itself. Restricting to real redirect links keeps
		// deliveries at ~zero while thumbnail renderers stream in, and deep still catches
		// the links YouTube nests inside added subtrees (SPA descriptions, dynamically
		// inserted sections) that shallow matching missed outright.
		unsubscribeBus = subscribeToDomMutations(REDIRECT_LINK_SELECTOR, unwrapRedirectElements, {
			deep: true
		});
		// The live chat iframe is a separate document this subscription cannot observe (the embedded
		// script never runs inside frames, and the shared observer stops at the top document's body),
		// so chat links would keep their redirect wrapper without a per-frame subscription.
		attachFrameUnwrapping();
		registry.on("removeRedirect", "bus", () => {
			unsubscribeBus?.();
			unsubscribeBus = null;
		});
		registry.on("removeRedirect", "chat-frames", detachFrameUnwrapping);
	}
});
