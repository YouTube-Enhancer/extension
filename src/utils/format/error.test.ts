import { describe, expect, test } from "vitest";

import { formatError } from "@/src/utils/format/error";

describe("formatError", () => {
	describe("values with message and stack", () => {
		test("returns the stack of an Error unchanged", () => {
			const error = new Error("boom");
			expect(formatError(error)).toBe(error.stack);
		});

		test("appends nothing when there is no cause", () => {
			const error = new Error("boom");
			expect(formatError(error)).not.toContain("Caused by:");
		});

		test("appends one Caused by link for a single cause", () => {
			const inner = new Error("inner");
			const outer = new Error("outer", { cause: inner });
			expect(formatError(outer)).toBe(`${outer.stack}\nCaused by: ${inner.stack}`);
		});

		test("recurses through a nested cause chain", () => {
			const root = new Error("root");
			const middle = new Error("middle", { cause: root });
			const outer = new Error("outer", { cause: middle });
			expect(formatError(outer)).toBe(
				`${outer.stack}\nCaused by: ${middle.stack}\nCaused by: ${root.stack}`
			);
		});

		test("accepts a plain object that only looks like an error", () => {
			expect(formatError({ message: "m", stack: "s" })).toBe("s");
			expect(formatError({ cause: "root cause", message: "m", stack: "s" })).toBe(
				"s\nCaused by: root cause"
			);
		});

		test("falls through when only message is present", () => {
			expect(formatError({ message: "no stack" })).toBe(
				JSON.stringify({ message: "no stack" }, null, 2)
			);
		});

		test("falls through when only stack is present", () => {
			expect(formatError({ stack: "no message" })).toBe(
				JSON.stringify({ stack: "no message" }, null, 2)
			);
		});
	});

	describe("plain strings", () => {
		test("passes a string through unchanged", () => {
			expect(formatError("plain failure")).toBe("plain failure");
		});
	});

	describe("everything else", () => {
		test("pretty-prints an object as JSON", () => {
			const value = { code: 1, tags: ["a", "b"] };
			expect(formatError(value)).toBe(JSON.stringify(value, null, 2));
		});

		test("pretty-prints an array as JSON", () => {
			expect(formatError([1, 2])).toBe(JSON.stringify([1, 2], null, 2));
		});

		test("renders null and numbers as JSON", () => {
			expect(formatError(null)).toBe("null");
			expect(formatError(42)).toBe("42");
		});

		test("falls back to String() for a circular structure", () => {
			const circular: Record<string, unknown> = { name: "loop" };
			circular.self = circular;
			// JSON.stringify throws on the cycle, so the catch returns String(circular) === "[object Object]".
			expect(formatError(circular)).toBe("[object Object]");
		});

		test("falls back to String() for a BigInt, which JSON cannot represent", () => {
			expect(formatError(10n)).toBe(String(10n));
		});
	});
});
