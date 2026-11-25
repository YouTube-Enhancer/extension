import { afterEach, describe, expect, test, vi } from "vitest";

import { invalidatePageTypeCache } from "@/src/utils/url";
import { getNavigationSignature, VOLATILE_URL_PARAMS } from "@/src/utils/url/signature";

/**
 * `getNavigationSignature` reads `window.location` and classifies through `getCurrentPageType`,
 * which caches per URL. This stubs only the URL inputs — the classification and signature logic
 * under test is the real product code. No jsdom/happy-dom: the runner stays in the node environment.
 */
const stubUrl = (href: string): void => {
	const url = new URL(href);
	vi.stubGlobal("document", {});
	vi.stubGlobal("window", {
		location: {
			hostname: url.hostname,
			href: url.href,
			pathname: url.pathname,
			search: url.search
		}
	});
	invalidatePageTypeCache();
};

const signatureFor = (href: string) => {
	stubUrl(href);
	return getNavigationSignature();
};

afterEach(() => {
	vi.unstubAllGlobals();
	invalidatePageTypeCache();
});

describe("getNavigationSignature", () => {
	test("returns null when the page type does not classify", () => {
		// No window/document in the node test environment.
		expect(getNavigationSignature()).toBeNull();
	});

	test("returns the same signature for a stable URL", () => {
		stubUrl("https://www.youtube.com/watch?v=abc123&t=10");
		const first = getNavigationSignature();
		const second = getNavigationSignature();
		expect(first).toBe("watch:abc123");
		expect(second).toBe(first);
	});

	test("signatures simple page types", () => {
		expect(signatureFor("https://www.youtube.com/")).toBe("home");
		expect(signatureFor("https://www.youtube.com/feed/subscriptions")).toBe("subscriptions");
	});

	describe("volatile params", () => {
		// `v` is listed as volatile for the query suffix but surfaces as the signature's video id.
		for (const param of VOLATILE_URL_PARAMS) {
			if (param === "v") continue;
			test(`strips ${param} from the signature`, () => {
				const low = signatureFor(`https://www.youtube.com/watch?v=abc123&${param}=1`);
				const high = signatureFor(`https://www.youtube.com/watch?v=abc123&${param}=9999`);
				expect(low).toBe("watch:abc123");
				expect(high).toBe(low);
			});
		}

		test("uses the volatile video id as the signature itself", () => {
			expect(signatureFor("https://www.youtube.com/watch?v=abc123")).toBe("watch:abc123");
			expect(signatureFor("https://www.youtube.com/watch?v=xyz789")).toBe("watch:xyz789");
		});

		test("strips every volatile param in one URL", () => {
			expect(signatureFor("https://www.youtube.com/watch?v=abc123&t=1&start=2&si=3")).toBe(
				"watch:abc123"
			);
		});
	});

	describe("non-volatile params", () => {
		test("keeps a non-volatile param in the signature", () => {
			expect(signatureFor("https://www.youtube.com/watch?v=abc123&index=2")).toBe(
				"watch:abc123:index=2"
			);
			expect(signatureFor("https://www.youtube.com/watch?v=abc123&index=3")).toBe(
				"watch:abc123:index=3"
			);
		});

		test("joins several non-volatile params in query order", () => {
			expect(signatureFor("https://www.youtube.com/watch?v=abc123&list=PL1&index=2")).toBe(
				"watch:abc123:list=PL1,index=2"
			);
		});
	});

	describe("watch", () => {
		test("falls back to watch:unknown without a video id", () => {
			expect(signatureFor("https://www.youtube.com/watch")).toBe("watch:unknown");
		});
	});

	describe("live", () => {
		test("uses the live video id and drops volatile params", () => {
			expect(signatureFor("https://www.youtube.com/live?v=Vid123&t=5")).toBe("live:Vid123");
		});

		test("falls back to live:unknown without a video id", () => {
			expect(signatureFor("https://www.youtube.com/live")).toBe("live:unknown");
		});
	});

	describe("playlist", () => {
		test("keeps the playlist id and drops list from the suffix", () => {
			expect(signatureFor("https://www.youtube.com/playlist?list=PL123&index=4")).toBe(
				"playlist:PL123:index=4"
			);
		});

		test("falls back to playlist:unknown without a list", () => {
			expect(signatureFor("https://www.youtube.com/playlist")).toBe("playlist:unknown");
		});
	});

	describe("search", () => {
		test("keeps a short query as-is", () => {
			expect(signatureFor("https://www.youtube.com/results?search_query=short")).toBe(
				"search:short"
			);
		});

		test("truncates a query longer than 50 characters", () => {
			const longQuery = "q".repeat(51);
			expect(signatureFor(`https://www.youtube.com/results?search_query=${longQuery}`)).toBe(
				`search:${"q".repeat(50)}...`
			);
		});

		test("falls back to search:unknown without a query", () => {
			expect(signatureFor("https://www.youtube.com/results")).toBe("search:unknown");
		});
	});

	describe("shorts", () => {
		test("uses the short id", () => {
			expect(signatureFor("https://www.youtube.com/shorts/AbCd123")).toBe("shorts:AbCd123");
		});

		test("falls back to shorts:unknown without an id", () => {
			expect(signatureFor("https://www.youtube.com/shorts")).toBe("shorts:unknown");
		});
	});

	describe("channels", () => {
		test("signatures a handle channel home", () => {
			expect(signatureFor("https://www.youtube.com/@SomeChannel")).toBe(
				"channel_home:@SomeChannel"
			);
		});

		test("keeps extra path segments after the handle", () => {
			expect(signatureFor("https://www.youtube.com/@SomeChannel/featured")).toBe(
				"channel_home:@SomeChannel:featured"
			);
		});

		test("signatures the videos tab with and without a suffix", () => {
			expect(signatureFor("https://www.youtube.com/@SomeChannel/videos")).toBe(
				"channel_videos:@SomeChannel"
			);
			expect(signatureFor("https://www.youtube.com/@SomeChannel/videos/p")).toBe(
				"channel_videos:@SomeChannel:p"
			);
		});

		test("signatures the posts tab", () => {
			expect(signatureFor("https://www.youtube.com/@SomeChannel/posts")).toBe(
				"channel_posts:@SomeChannel"
			);
		});

		test("signatures the streams tab", () => {
			expect(signatureFor("https://www.youtube.com/@SomeChannel/streams")).toBe(
				"channel_streams:@SomeChannel"
			);
		});
	});
});
