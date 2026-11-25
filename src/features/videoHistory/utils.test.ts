import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { VideoId } from "@/src/types";

import { requestStoredVideoEntry } from "@/src/features/videoHistory/utils";

const mocks = vi.hoisted(() => ({
	waitForSpecificMessage: vi.fn()
}));

vi.mock("@/src/utils/messaging", () => ({
	waitForSpecificMessage: mocks.waitForSpecificMessage
}));

/**
 * The accessor is a try/catch over one messaging call, and the messaging module is the only
 * runtime import of `utils.ts`, so stubbing it here covers both bridge outcomes: a healthy
 * round trip (milliseconds) and a dead one (rejection after the budget).
 */
const videoId = "abc12345678" as VideoId;
const entry = { id: "abc12345678", status: "watching", timestamp: 42 };

describe("requestStoredVideoEntry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("resolves the stored entry when the bridge answers", async () => {
		mocks.waitForSpecificMessage.mockResolvedValue({
			data: { videoHistory: { storage: { abc12345678: entry } } }
		});

		await expect(requestStoredVideoEntry(videoId)).resolves.toEqual(entry);
	});

	test("resolves null when the bridge carries no entry for this video", async () => {
		mocks.waitForSpecificMessage.mockResolvedValue({
			data: { videoHistory: { storage: {} } }
		});

		await expect(requestStoredVideoEntry(videoId)).resolves.toBeNull();
	});

	test("warns loudly and still resolves null when the read fails", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		mocks.waitForSpecificMessage.mockRejectedValue(
			new Error('waitForSpecificMessage timed out after 500ms waiting for "state"')
		);

		await expect(requestStoredVideoEntry(videoId)).resolves.toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]?.[0])).toContain("[yte] videoHistory");
	});

	test("passes the short budget as the per-call timeout option", async () => {
		mocks.waitForSpecificMessage.mockResolvedValue({ data: {} });

		await requestStoredVideoEntry(videoId);

		// Pinned to VIDEO_HISTORY_ENTRY_TIMEOUT_MS in utils.ts, which is module-private.
		expect(mocks.waitForSpecificMessage).toHaveBeenCalledWith(
			"state",
			"request_data",
			"extension",
			undefined,
			{ timeout: 500 }
		);
	});
});
