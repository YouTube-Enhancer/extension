import { beforeEach, describe, expect, test, vi } from "vitest";

import { storageListeners } from "@/src/pages/content/storageForwarding";
import {
	onWindowMessage,
	registerStorageForwardingHooks,
	storage
} from "@/src/pages/content/windowMessageDispatcher";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";

const mocks = vi.hoisted(() => ({
	changeListeners: [] as Array<(changes: unknown, areaName: string) => void>,
	sendExtensionOnlyMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	setAttribute: vi.fn(),
	storageGet: vi.fn((_keys?: unknown) => Promise.resolve({} as Record<string, unknown>)),
	storageSet: vi.fn((_value?: unknown) => Promise.resolve(undefined))
}));

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: {
			getURL: vi.fn(() => "chrome-extension://unit-test/"),
			sendMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined))
		},
		storage: {
			local: {
				get: mocks.storageGet,
				set: mocks.storageSet
			},
			onChanged: {
				addListener: (listener: (changes: unknown, areaName: string) => void) => {
					mocks.changeListeners.push(listener);
				},
				removeListener: (listener: (changes: unknown, areaName: string) => void) => {
					const index = mocks.changeListeners.indexOf(listener);
					if (index >= 0) mocks.changeListeners.splice(index, 1);
				}
			}
		}
	}
}));

vi.mock("@/src/utils/messaging", () => ({
	MESSAGE_ORIGIN: "yte-messaging",
	sendExtensionMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	sendExtensionOnlyMessage: mocks.sendExtensionOnlyMessage
}));

/**
 * The handler is pure over its `event` argument apart from `window` (source guard) and
 * `document.documentElement` (the readiness marker `pageLoaded` sets). Node has neither, so the
 * shims below stand in for the content script's document; `browser.*` and the messaging module
 * are mocked above, exactly as the other two content-script specs do.
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

/** The dispatcher's switch body runs inside a detached `void (async () => …)`. */
const flush = async (): Promise<void> => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
};

const dispatch = (data: unknown): void => {
	onWindowMessage({ data, source: testWindow } as unknown as MessageEvent);
};

const origin = "yte-messaging";

/**
 * The same wiring `src/pages/content/index.ts` registers: `pageLoaded` flips one boolean and
 * attaches `storageListeners` to the storage bridge. Duplicated here because importing index.ts
 * runs its module side effects (script injection, the readiness poll); the contract under test
 * is the handshake, not those.
 */
let storageForwardingEnabled = false;
const enableStorageForwarding = (): void => {
	if (storageForwardingEnabled) return;
	storageForwardingEnabled = true;
	storage.onChanged.addListener(storageListeners);
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.storageGet.mockResolvedValue({});
	mocks.changeListeners.length = 0;
	storageForwardingEnabled = false;
	registerStorageForwardingHooks({
		enable: enableStorageForwarding,
		isEnabled: () => storageForwardingEnabled
	});
});

describe("pageLoaded handshake", () => {
	test("holds storage changes back until pageLoaded arrives", async () => {
		// Other traffic on the same bus must not open the gate: only pageLoaded does.
		dispatch({ action: "request_data", origin, requestId: "req-1", type: "options" });
		await flush();

		expect(storageForwardingEnabled).toBe(false);
		// Nothing is attached to the storage bridge, so a change on the wire has no path to the page.
		expect(mocks.changeListeners).toHaveLength(0);
		expect(mocks.sendExtensionOnlyMessage).not.toHaveBeenCalled();
	});

	test("attaches the storage listener so a later change reaches the page", async () => {
		dispatch({ action: "send_data", origin, type: "pageLoaded" });
		await flush();

		expect(storageForwardingEnabled).toBe(true);
		expect(mocks.changeListeners).toEqual([storageListeners]);

		storageListeners(
			{
				automaticallyDisableAmbientMode: {
					newValue: { enabled: true },
					oldValue: { enabled: false }
				}
			},
			"local"
		);
		await flush();

		const { automaticallyDisableAmbientMode } = getDefaultConfiguration();
		expect(mocks.sendExtensionOnlyMessage).toHaveBeenCalledTimes(1);
		expect(mocks.sendExtensionOnlyMessage).toHaveBeenCalledWith("featureUpdate", {
			config: automaticallyDisableAmbientMode,
			enabled: automaticallyDisableAmbientMode.enabled,
			id: "automaticallyDisableAmbientMode"
		});
	});

	test("marks the document ready so the fallback readiness poll resolves", async () => {
		dispatch({ action: "send_data", origin, type: "pageLoaded" });
		await flush();

		expect(mocks.setAttribute).toHaveBeenCalledWith("yte-ready", "");
	});

	test("is idempotent: a repeated pageLoaded does not attach a second listener", async () => {
		dispatch({ action: "send_data", origin, type: "pageLoaded" });
		dispatch({ action: "send_data", origin, type: "pageLoaded" });
		await flush();

		expect(mocks.changeListeners).toHaveLength(1);
	});
});
