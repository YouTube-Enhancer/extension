import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	onWindowMessage,
	registerStorageForwardingHooks
} from "@/src/pages/content/windowMessageDispatcher";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";

const mocks = vi.hoisted(() => ({
	enableForwarding: vi.fn(),
	getURL: vi.fn(() => "chrome-extension://unit-test/"),
	isForwardingEnabled: vi.fn(() => false),
	sendExtensionMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	sendMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	setAttribute: vi.fn(),
	storageGet: vi.fn((_keys?: unknown) => Promise.resolve({} as Record<string, unknown>)),
	storageSet: vi.fn((_value?: unknown) => Promise.resolve(undefined))
}));

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: {
			getURL: mocks.getURL,
			sendMessage: mocks.sendMessage
		},
		storage: {
			local: {
				get: mocks.storageGet,
				set: mocks.storageSet
			}
		}
	}
}));

vi.mock("@/src/utils/messaging", () => ({
	MESSAGE_ORIGIN: "yte-messaging",
	sendExtensionMessage: mocks.sendExtensionMessage,
	sendExtensionOnlyMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined))
}));

/**
 * The handler is pure over its `event` argument apart from three globals: `window` (source guard),
 * `window.location` (video id for state scoping) and `document.documentElement` (readiness /
 * acknowledgement markers). Node has none of them, so the minimal shims below stand in for the
 * content script's document; `browser.*` and the messaging module are mocked above.
 */
const testWindow = {
	location: {
		hostname: "www.youtube.com",
		href: "https://www.youtube.com/watch?v=abc12345678",
		pathname: "/watch",
		search: "?v=abc12345678"
	},
	postMessage: vi.fn()
} as unknown as typeof globalThis & Window;

Object.defineProperty(globalThis, "window", { configurable: true, value: testWindow });
Object.defineProperty(globalThis, "document", {
	configurable: true,
	value: { documentElement: { removeAttribute: vi.fn(), setAttribute: mocks.setAttribute } }
});

/** The switch body runs inside a detached `void (async () => …)`, so assertions wait a macrotask. */
const flush = async (): Promise<void> => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
};

const dispatch = (data: unknown, source: unknown = testWindow): void => {
	onWindowMessage({ data, source } as unknown as MessageEvent);
};

const origin = "yte-messaging";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.storageGet.mockResolvedValue({});
	mocks.isForwardingEnabled.mockReturnValue(false);
	registerStorageForwardingHooks({
		enable: mocks.enableForwarding,
		isEnabled: mocks.isForwardingEnabled
	});
});

describe("window message dispatcher", () => {
	test("ignores a message whose source is not the window", async () => {
		dispatch(
			{ action: "request_action", origin, type: "pauseBackgroundPlayers" },
			{} // some other frame
		);
		await flush();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(mocks.sendExtensionMessage).not.toHaveBeenCalled();
	});

	test("ignores a message whose origin is not MESSAGE_ORIGIN", async () => {
		dispatch({ action: "request_action", origin: "evil.example", type: "pauseBackgroundPlayers" });
		await flush();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	test("forwards pauseBackgroundPlayers with the source field forced to content", async () => {
		dispatch({ action: "request_action", origin, type: "pauseBackgroundPlayers" });
		await flush();
		expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
		expect(mocks.sendMessage).toHaveBeenCalledWith({
			action: "request_action",
			origin,
			source: "content",
			type: "pauseBackgroundPlayers"
		});
	});

	test("does not forward any other request_action type", async () => {
		dispatch({ action: "request_action", origin, type: "pauseBackgroundPlayerses" });
		await flush();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	test("ignores an unknown action", async () => {
		dispatch({ action: "not_a_real_action", origin });
		await flush();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(mocks.sendExtensionMessage).not.toHaveBeenCalled();
		expect(mocks.storageSet).not.toHaveBeenCalled();
	});

	test("answers request_data/extensionURL with the extension URL", async () => {
		dispatch({ action: "request_data", origin, requestId: "req-1", type: "extensionURL" });
		await flush();
		expect(mocks.sendExtensionMessage).toHaveBeenCalledWith(
			"extensionURL",
			"data_response",
			{ extensionURL: "chrome-extension://unit-test/" },
			"req-1"
		);
	});

	test("answers request_data/options with the stored settings", async () => {
		dispatch({ action: "request_data", origin, requestId: "req-2", type: "options" });
		await flush();
		expect(mocks.storageGet).toHaveBeenCalled();
		expect(mocks.sendExtensionMessage).toHaveBeenCalledTimes(1);
		// Storage is empty in this test, so the cache falls back to the default configuration.
		expect(mocks.sendExtensionMessage).toHaveBeenCalledWith(
			"options",
			"data_response",
			{ options: getDefaultConfiguration() },
			"req-2"
		);
	});

	test("answers request_data/state with the page-scoped state", async () => {
		dispatch({ action: "request_data", origin, requestId: "req-3", type: "state" });
		await flush();
		expect(mocks.sendExtensionMessage).toHaveBeenCalledTimes(1);
		// No stored videoHistory in storage: the state crosses untouched.
		expect(mocks.sendExtensionMessage).toHaveBeenCalledWith("state", "data_response", {}, "req-3");
	});

	test("ignores a featureStateUpdate for an id that is not a registered stateful feature", async () => {
		dispatch({
			action: "send_data",
			data: { id: "notARegisteredFeature", state: { anything: true } },
			origin,
			type: "featureStateUpdate"
		});
		await flush();
		expect(mocks.storageSet).not.toHaveBeenCalled();
	});

	test("pageLoaded enables forwarding through the registered hook and marks the document ready", async () => {
		dispatch({ action: "send_data", origin, type: "pageLoaded" });
		await flush();
		expect(mocks.enableForwarding).toHaveBeenCalledTimes(1);
		expect(mocks.setAttribute).toHaveBeenCalledWith("yte-ready", "");
	});
});
