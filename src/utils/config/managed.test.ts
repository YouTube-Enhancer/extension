import { beforeEach, describe, expect, test, vi } from "vitest";

import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { applyManagedSettings } from "@/src/utils/config/managed";

const mocks = vi.hoisted(() => ({
	localGet: vi.fn((_keys?: unknown) => Promise.resolve({} as Record<string, unknown>)),
	localSet: vi.fn((_items: Record<string, unknown>) => Promise.resolve(undefined)),
	managedGet: vi.fn(() => Promise.resolve({} as Record<string, unknown>))
}));

vi.mock("webextension-polyfill", () => ({
	default: {
		runtime: {},
		storage: {
			local: { get: mocks.localGet, set: mocks.localSet },
			managed: { get: mocks.managedGet }
		}
	}
}));

const defaults = getDefaultConfiguration();

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	mocks.localGet.mockImplementation((keys) =>
		Promise.resolve(
			Object.fromEntries(
				(keys as string[]).map((key) => [key, defaults[key as keyof typeof defaults]])
			)
		)
	);
});

describe("applyManagedSettings", () => {
	test("does nothing when the extension has no policy", async () => {
		mocks.managedGet.mockRejectedValue(new Error("Managed storage manifest not found"));
		expect(await applyManagedSettings()).toEqual([]);
		expect(mocks.localSet).not.toHaveBeenCalled();
	});

	test("merges a partial policy value into the stored one", async () => {
		mocks.managedGet.mockResolvedValue({ playerSpeed: { speed: 1.75 } });
		expect(await applyManagedSettings()).toEqual(["playerSpeed"]);
		expect(mocks.localSet).toHaveBeenCalledWith({
			playerSpeed: { ...defaults.playerSpeed, speed: 1.75 }
		});
	});

	test("merges into nested objects", async () => {
		mocks.managedGet.mockResolvedValue({ hideShorts: { home: { enabled: true } } });
		await applyManagedSettings();
		expect(mocks.localSet).toHaveBeenCalledWith({
			hideShorts: { ...defaults.hideShorts, home: { enabled: true } }
		});
	});

	test("does not write values that are already stored", async () => {
		mocks.managedGet.mockResolvedValue({ playerSpeed: { speed: defaults.playerSpeed.speed } });
		expect(await applyManagedSettings()).toEqual([]);
		expect(mocks.localSet).not.toHaveBeenCalled();
	});

	test("skips unknown keys and invalid values", async () => {
		mocks.managedGet.mockResolvedValue({
			notASetting: true,
			playerSpeed: { speed: "fast" },
			removeRedirect: { enabled: true },
			"state:videoHistory": {}
		});
		expect(await applyManagedSettings()).toEqual(["removeRedirect"]);
		expect(mocks.localSet).toHaveBeenCalledWith({ removeRedirect: { enabled: true } });
	});

	test("replaces non-object values", async () => {
		mocks.managedGet.mockResolvedValue({ language: "fr-FR" });
		await applyManagedSettings();
		expect(mocks.localSet).toHaveBeenCalledWith({ language: "fr-FR" });
	});
});
