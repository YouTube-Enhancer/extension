import { beforeEach, describe, expect, test, vi } from "vitest";

import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { storageListeners } from "@/src/pages/content/storageForwarding";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";

const mocks = vi.hoisted(() => ({
	sendExtensionOnlyMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	storageGet: vi.fn((_keys?: unknown) => Promise.resolve({} as Record<string, unknown>))
}));

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: {},
		storage: {
			local: {
				get: mocks.storageGet,
				set: vi.fn((..._args: unknown[]) => Promise.resolve(undefined))
			}
		}
	}
}));

vi.mock("@/src/utils/messaging", () => ({
	MESSAGE_ORIGIN: "yte-messaging",
	sendExtensionMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined)),
	sendExtensionOnlyMessage: mocks.sendExtensionOnlyMessage
}));

/** `storageChangeHandler` resolves the settings cache before it broadcasts, so assertions wait a macrotask. */
const flush = async (): Promise<void> => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
};

type ChangeRecord = Parameters<typeof storageListeners>[0];

const lastCallOf = (calls: readonly unknown[][]): undefined | unknown[] => {
	const [last] = calls;
	return last;
};

const defaults = getDefaultConfiguration();

beforeEach(() => {
	vi.clearAllMocks();
	mocks.storageGet.mockResolvedValue({});
});

describe("storage-change forwarding", () => {
	test("ignores changes from a storage area other than local", async () => {
		storageListeners(
			{
				automaticallyDisableAmbientMode: {
					newValue: { enabled: true },
					oldValue: { enabled: false }
				}
			},
			"sync"
		);
		await flush();
		expect(mocks.sendExtensionOnlyMessage).not.toHaveBeenCalled();
	});

	test("broadcasts stateReset when a registered state key is cleared", async () => {
		storageListeners(
			{
				"state:videoHistory": { newValue: undefined, oldValue: { storage: {} } }
			} as unknown as ChangeRecord,
			"local"
		);
		await flush();
		expect(mocks.sendExtensionOnlyMessage).toHaveBeenCalledTimes(1);
		expect(lastCallOf(mocks.sendExtensionOnlyMessage.mock.calls)).toEqual([
			"stateReset",
			{ ids: ["videoHistory"] }
		]);
		// The state key is not a configuration key, so no featureUpdate follows.
	});

	test("broadcasts a featureUpdate for a changed config key", async () => {
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
		const { automaticallyDisableAmbientMode: feature } = defaults;
		expect(lastCallOf(mocks.sendExtensionOnlyMessage.mock.calls)).toEqual([
			"featureUpdate",
			{ config: feature, enabled: resolveEnabled(feature), id: "automaticallyDisableAmbientMode" }
		]);
	});

	test("ignores keys that are not part of the configuration", async () => {
		storageListeners(
			{ notAConfigKey: { newValue: "x", oldValue: "y" } } as unknown as ChangeRecord,
			"local"
		);
		await flush();
		expect(mocks.sendExtensionOnlyMessage).not.toHaveBeenCalled();
	});
});
