import type { configuration, StorageChanges } from "@/src/types";

import {
	DEV_RELOAD_SOURCE,
	type DevWindowMessage,
	isDevRuntimeMessage,
	isDevWindowMessage
} from "@/src/utils/dev/hotReload";
import { isSlotFree, waitForSlotRelease } from "@/src/utils/embedded/instanceLiveness";
import {
	invalidateDevToolsCache,
	setupContentScriptBridge,
	teardownContentScriptBridge
} from "@/src/utils/messaging/devtools";

type DevelopmentModeDeps = {
	defaultConfiguration: configuration;
	injectEmbeddedScript: (buildId?: string) => void;
	onPageHide: () => void;
	onWindowMessage: (event: MessageEvent) => void;
	scheduleEmbeddedScript: () => void;
	storage: {
		onChanged: {
			addListener: (
				callback: (changes: StorageChanges<configuration>, areaName: string) => void
			) => void;
			removeListener: (
				callback: (changes: StorageChanges<configuration>, areaName: string) => void
			) => void;
		};
	};
	storageListeners: (changes: StorageChanges<configuration>, areaName: string) => void;
};

/**
 * Development only. Hot reload, content-script takeover, and the devtools bridge live here
 * so production content bundles never import them. Loaded via dynamic import from
 * `content/index.ts` when `DEV_MODE` is true.
 */
export function startDevelopmentMode({
	defaultConfiguration,
	injectEmbeddedScript,
	onPageHide,
	onWindowMessage,
	scheduleEmbeddedScript,
	storage,
	storageListeners
}: DevelopmentModeDeps): void {
	const isReinjection = (globalThis as { __yteDevReinject?: boolean }).__yteDevReinject === true;
	delete (globalThis as { __yteDevReinject?: boolean }).__yteDevReinject;
	const instanceId = crypto.randomUUID();

	const requestEmbeddedDispose = () =>
		new Promise<void>((resolve) => {
			let done = false;
			const finish = () => {
				if (done) return;
				done = true;
				clearTimeout(timeout);
				clearInterval(slotPoll);
				window.removeEventListener("message", onDisposed);
				resolve();
			};
			const onDisposed = (event: MessageEvent) => {
				if (
					event.source === window &&
					isDevWindowMessage(event.data) &&
					event.data.type === "disposed"
				)
					finish();
			};
			/**
			 * The embedded instance clears its page-wide slot on dispose. Poll via the
			 * liveness module (DOM/page contract) as well as the disposed message so a
			 * missed message still cannot stack the next injection.
			 */
			const slotPoll = setInterval(() => {
				if (isSlotFree()) finish();
			}, 50);
			const timeout = setTimeout(finish, 2000);
			void waitForSlotRelease(2000, 50).then(() => finish());
			window.addEventListener("message", onDisposed);
			window.postMessage(
				{ source: DEV_RELOAD_SOURCE, type: "dispose" } satisfies DevWindowMessage,
				"*"
			);
		});
	const swapEmbeddedScript = async (buildId: string) => {
		await requestEmbeddedDispose();
		for (const oldScript of document.querySelectorAll('script[src*="src/pages/embedded/index.js"]'))
			oldScript.remove();
		injectEmbeddedScript(buildId);
	};
	const devInvalidateListener = (changes: Record<string, unknown>, areaName: string) => {
		if (areaName !== "local") return;
		const keys = Object.keys(changes).filter((key) => key in defaultConfiguration);
		if (!keys.length) return;
		void invalidateDevToolsCache(keys);
	};
	const onDevRuntimeMessage = (message: unknown) => {
		if (!isDevRuntimeMessage(message)) return false;
		void swapEmbeddedScript(message.buildId);
		return false;
	};
	const dispose = () => {
		window.removeEventListener("message", onWindowMessage);
		window.removeEventListener("message", onTakeoverMessage);
		window.removeEventListener("pagehide", onPageHide);
		try {
			storage.onChanged.removeListener(storageListeners);
			storage.onChanged.removeListener(devInvalidateListener);
			chrome.runtime.onMessage.removeListener(onDevRuntimeMessage);
			teardownContentScriptBridge();
		} catch {
			// Extension context invalidated: the listeners died with it.
		}
	};
	const onTakeoverMessage = (event: MessageEvent) => {
		if (
			event.source !== window ||
			!isDevWindowMessage(event.data) ||
			event.data.type !== "takeover"
		)
			return;
		if (event.data.instanceId === instanceId) return;
		dispose();
	};

	setupContentScriptBridge();
	storage.onChanged.addListener(devInvalidateListener);
	window.addEventListener("message", onTakeoverMessage);
	chrome.runtime.onMessage.addListener(onDevRuntimeMessage);

	if (isReinjection) {
		window.postMessage(
			{ instanceId, source: DEV_RELOAD_SOURCE, type: "takeover" } satisfies DevWindowMessage,
			"*"
		);
		void swapEmbeddedScript(Date.now().toString(36));
	} else {
		scheduleEmbeddedScript();
	}
}
