import browser from "webextension-polyfill";

import type { DevToolsMessageMappings, DevToolsMessages, DevToolsMessageType, DevToolsRequestDataMessage, Nullable } from "@/src/types";

let contentBridgeListenerAdded = false;

type pendingRequest = {
	collectionTimer: Nullable<ReturnType<typeof setTimeout>>;
	reject: (reason: unknown) => void;
	resolve: (response: unknown) => void;
	responses: Array<{
		data: unknown;
		requestId: string;
		source: string;
		tabId: number;
		type: string;
	}>;
	startTime: number;
};
const pendingRequests = new Map<string, pendingRequest>();

let messageListenerSetup = false;

// Cleanup interval for pending requests (5 minutes)
const PENDING_REQUEST_CLEANUP_INTERVAL = 5 * 60 * 1000;
let pendingRequestCleanupIntervalId: Nullable<NodeJS.Timeout> = null;

const onInvalidateCallbacks: Array<(keys: string[]) => void> = [];

export function onDevToolsCacheInvalidate(callback: (keys: string[]) => void): () => void {
	onInvalidateCallbacks.push(callback);
	return () => {
		const index = onInvalidateCallbacks.indexOf(callback);
		if (index !== -1) onInvalidateCallbacks.splice(index, 1);
	};
}

export async function sendDevToolsMessage<T extends DevToolsMessageType>(
	messageType: T,
	data: DevToolsMessageMappings[T]["request"] extends { data: infer D } ? D : undefined
): Promise<DevToolsMessageMappings[T]["response"] & { action: "data_response"; requestId: string; source: "extension"; type: T }> {
	const requestId = crypto.randomUUID();
	const timestamp = Date.now();

	return new Promise((resolve, reject) => {
		const inspectedTabId = browser.devtools?.inspectedWindow?.tabId;
		const message: DevToolsRequestDataMessage<T, typeof data> = {
			action: "request_data",
			data,
			extensionId: browser.runtime.id,
			requestId,
			source: "devtools",
			tabId: inspectedTabId,
			timestamp,
			type: messageType
		};

		const timeoutId = setTimeout(() => {
			reject(new Error("Timeout waiting for response"));
		}, 3000);

		void browser.runtime
			.sendMessage(undefined, message)
			.then((response: unknown) => {
				// Clear timeout on success
				clearTimeout(timeoutId);

				if (browser.runtime.lastError) {
					reject(new Error(browser.runtime.lastError.message));
					return;
				}
				const typedResponse = response as undefined | { requestId?: string };
				if (typedResponse?.requestId !== requestId) {
					reject(
						new Error(
							`Invalid response for message type ${messageType}: requestId mismatch. Expected ${requestId}, but got ${typedResponse?.requestId}`
						)
					);
					return;
				}

				resolve(
					response as DevToolsMessageMappings[T]["response"] & {
						action: "data_response";
						requestId: string;
						source: "extension";
						type: T;
					}
				);
				return;
			})
			.catch((error) => {
				// Clear timeout on error
				clearTimeout(timeoutId);
				throw error;
			});
	});
}

export function setupContentScriptBridge() {
	if (contentBridgeListenerAdded) return;
	contentBridgeListenerAdded = true;

	setupMessageListener();
	// Start pending request cleanup when content script bridge is set up
	startPendingRequestCleanup();

	// Stop pending request cleanup when page is unloaded (handles tab/window close and navigation away)
	window.addEventListener("beforeunload", stopPendingRequestCleanup);

	chrome.runtime.onMessage.addListener((message: DevToolsMessages["request"], _sender, sendResponse) => {
		if (window.self !== window.top) return false;

		const typedMessage = message;
		if (typedMessage.source !== "devtools") return false;

		const { requestId, type } = typedMessage;
		if (!requestId || !type) return false;
		if (pendingRequests.has(requestId)) return false;

		if (type === "devtools_invalidate_cache") {
			const { data } = typedMessage;
			notifyInvalidation(data.keys);
			void browser.runtime
				.sendMessage(undefined, {
					action: "invalidate_cache",
					data: { keys: data.keys },
					source: "devtools"
				})
				.then(() => {
					return sendResponse({ action: "data_response", data: { ok: true }, requestId, source: "content", tabId: 0, type });
				});
			return true;
		}

		const devToolsMessage = {
			...message,
			extensionId: browser.runtime.id,
			source: "content_script" as const
		};

		window.postMessage(devToolsMessage, "*");

		const resolveFn = (response: unknown) => {
			clearTimeout(timeoutId);
			pendingRequests.delete(requestId);
			sendResponse(response);
		};

		pendingRequests.set(requestId, {
			collectionTimer: null,
			reject: () => sendResponse({ action: "data_response", data: null, requestId, source: "content", tabId: 0, type }),
			resolve: resolveFn,
			responses: [],
			startTime: Date.now()
		});

		const timeoutId = setTimeout(() => {
			const pending = pendingRequests.get(requestId);
			if (pending) {
				pendingRequests.delete(requestId);
				pending.reject(new Error("Timeout"));
			}
		}, 3000);

		return true;
	});
}

function notifyInvalidation(keys: string[]): void {
	for (const callback of onInvalidateCallbacks) {
		callback(keys);
	}
}

function resolveResponse(requestId: string): void {
	const pending = pendingRequests.get(requestId);
	if (!pending) return;

	pendingRequests.delete(requestId);

	if (pending.responses.length === 0) {
		pending.reject(new Error("No responses received"));
		return;
	}

	const { responses } = pending;
	const mostRecent = responses.at(-1);
	if (!mostRecent) return;
	pending.resolve({
		action: "data_response",
		data: mostRecent.data,
		requestId,
		source: mostRecent.source,
		tabId: mostRecent.tabId,
		type: mostRecent.type
	});
}

function setupMessageListener() {
	if (messageListenerSetup) return;
	messageListenerSetup = true;

	const {
		runtime: { id: extensionId }
	} = chrome;

	window.addEventListener("message", (event: MessageEvent) => {
		const rawData = event.data as { action?: string; data?: unknown; extensionId?: string; requestId?: string; source?: string };
		if (!rawData) return;

		if (rawData.action === "request_storage_update" && rawData.source === "injected") {
			void (async () => {
				try {
					await browser.storage.local.set(rawData.data as Record<string, unknown>);
				} catch (error) {
					console.error("[DevTools ContentScript] Failed to persist storage update from injected script:", error);
				}
			})();
		}

		if (rawData.action !== "data_response") return;
		if (rawData.source !== "injected") return;
		if (rawData.extensionId !== extensionId) return;

		const { requestId } = rawData;
		if (!requestId) return;

		const pending = pendingRequests.get(requestId);
		if (!pending) return;

		const typedData = rawData as { data: unknown; requestId: string; source: string; tabId: number; type: string };

		const isDuplicate = pending.responses.some(
			(existing) =>
				existing.requestId === typedData.requestId &&
				existing.source === typedData.source &&
				JSON.stringify(existing.data) === JSON.stringify(typedData.data)
		);
		if (isDuplicate) {
			return;
		}

		pending.responses.push({
			data: typedData.data,
			requestId: typedData.requestId,
			source: typedData.source,
			tabId: typedData.tabId,
			type: typedData.type
		});

		clearTimeout(pending.collectionTimer!);
		pending.collectionTimer = setTimeout(() => resolveResponse(requestId), 200);
	});
}

// Start periodic cleanup of pending requests
function startPendingRequestCleanup() {
	if (pendingRequestCleanupIntervalId !== null) return;

	pendingRequestCleanupIntervalId = setInterval(() => {
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in milliseconds

		for (const [requestId, pending] of pendingRequests.entries()) {
			// Remove requests that are older than 5 minutes
			if (pending.startTime < fiveMinutesAgo) pendingRequests.delete(requestId);
		}
	}, PENDING_REQUEST_CLEANUP_INTERVAL);
}

// Stop periodic cleanup of pending requests
function stopPendingRequestCleanup() {
	if (pendingRequestCleanupIntervalId !== null) {
		clearInterval(pendingRequestCleanupIntervalId);
		pendingRequestCleanupIntervalId = null;
	}
}
