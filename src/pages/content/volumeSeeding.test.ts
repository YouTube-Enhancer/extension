import { beforeEach, describe, expect, test, vi } from "vitest";

import { seedPersistedVolumeAtStart } from "@/src/pages/content/volumeSeeding";

const mocks = vi.hoisted(() => ({
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
	sendExtensionOnlyMessage: vi.fn((..._args: unknown[]) => Promise.resolve(undefined))
}));

/**
 * The seeding path reads three globals Node has none of: `window.location` (the bucket choice
 * runs `isShortsPage()`), and `window.localStorage` / `window.sessionStorage` where the seed and
 * its backup land. The minimal shims below stand in for the content script's document; `browser.*`
 * is mocked above, mirroring windowMessageDispatcher.test.ts.
 */
const makeStorage = (): Storage => {
	const data = new Map<string, string>();
	return {
		clear: () => data.clear(),
		getItem: (key: string) => data.get(key) ?? null,
		key: (index: number) => [...data.keys()][index] ?? null,
		get length() {
			return data.size;
		},
		removeItem: (key: string) => void data.delete(key),
		setItem: (key: string, value: string) => void data.set(key, String(value))
	};
};

let localStorageShim = makeStorage();
let sessionStorageShim = makeStorage();

const installWindow = (href: string): void => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			localStorage: localStorageShim,
			location: { hostname: "www.youtube.com", href, pathname: "/watch", search: "?v=abc12345678" },
			sessionStorage: sessionStorageShim
		}
	});
};

/** The envelope wrapper YouTube's player parses (`{creation, data}` around `{"volume", "muted"}`). */
const storedVolume = (store: Storage): null | { muted: boolean; volume: number } => {
	const raw = store.getItem("yt-player-volume");
	if (!raw) return null;
	const envelope = JSON.parse(raw) as { data: string };
	return JSON.parse(envelope.data) as { muted: boolean; volume: number };
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.storageGet.mockResolvedValue({});
	localStorageShim = makeStorage();
	sessionStorageShim = makeStorage();
	installWindow("https://www.youtube.com/watch?v=abc12345678");
});

describe("seedPersistedVolumeAtStart", () => {
	test("seeds the configured global volume into both of the player's stores", async () => {
		mocks.storageGet.mockResolvedValue({
			globalVolume: JSON.stringify({ enabled: true, volume: 30 }),
			rememberVolume: JSON.stringify({ enabled: false })
		});

		await seedPersistedVolumeAtStart();

		expect(storedVolume(localStorageShim)).toEqual({ muted: false, volume: 30 });
		expect(storedVolume(sessionStorageShim)).toEqual({ muted: false, volume: 30 });
	});

	test("seeds the remembered watch bucket when global volume is off", async () => {
		mocks.storageGet.mockResolvedValue({
			globalVolume: JSON.stringify({ enabled: false, volume: 25 }),
			rememberVolume: JSON.stringify({ enabled: true }),
			"state:rememberVolume": JSON.stringify({ shortsPageVolume: 10, watchPageVolume: 55 })
		});

		await seedPersistedVolumeAtStart();

		expect(storedVolume(localStorageShim)).toEqual({ muted: false, volume: 55 });
		expect(storedVolume(sessionStorageShim)).toEqual({ muted: false, volume: 55 });
	});

	test("leaves the player's store untouched when no volume feature owns it", async () => {
		mocks.storageGet.mockResolvedValue({});

		await seedPersistedVolumeAtStart();

		expect(localStorageShim.getItem("yt-player-volume")).toBeNull();
		expect(localStorageShim.getItem("yte_persisted_volume_backup")).toBeNull();
		expect(sessionStorageShim.getItem("yt-player-volume")).toBeNull();
	});

	test("a storage failure never delays or breaks startup", async () => {
		mocks.storageGet.mockRejectedValue(new Error("storage unavailable"));

		await expect(seedPersistedVolumeAtStart()).resolves.toBeUndefined();

		expect(localStorageShim.getItem("yt-player-volume")).toBeNull();
	});
});
