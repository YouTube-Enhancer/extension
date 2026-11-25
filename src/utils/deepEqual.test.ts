import { describe, expect, test } from "vitest";

import { deepEqual } from "@/src/utils/deepEqual";

describe("deepEqual", () => {
	describe("primitives", () => {
		test("compares primitives with strict equality", () => {
			expect(deepEqual(1, 1)).toBe(true);
			expect(deepEqual("a", "a")).toBe(true);
			expect(deepEqual(true, true)).toBe(true);
			expect(deepEqual(undefined, undefined)).toBe(true);
			expect(deepEqual(null, null)).toBe(true);
			expect(deepEqual(1, 2)).toBe(false);
			expect(deepEqual("a", "b")).toBe(false);
			expect(deepEqual(0, false)).toBe(false);
			expect(deepEqual("1", 1)).toBe(false);
		});

		test("treats NaN as unequal to itself, like === does", () => {
			expect(deepEqual(Number.NaN, Number.NaN)).toBe(false);
		});

		test("never equates null with an object", () => {
			expect(deepEqual(null, {})).toBe(false);
			expect(deepEqual({}, null)).toBe(false);
			expect(deepEqual(null, [])).toBe(false);
		});
	});

	describe("arrays", () => {
		test("compares empty arrays", () => {
			expect(deepEqual([], [])).toBe(true);
		});

		test("compares equal arrays of the same length", () => {
			expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
		});

		test("rejects a length mismatch", () => {
			expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
			expect(deepEqual([], [1])).toBe(false);
		});

		test("rejects a value mismatch at any index", () => {
			expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
			expect(deepEqual([[1]], [[2]])).toBe(false);
		});

		test("rejects an array compared against an object", () => {
			expect(deepEqual([], {})).toBe(false);
			expect(deepEqual({}, [])).toBe(false);
			expect(deepEqual({ 0: 1, 1: 2 }, [1, 2])).toBe(false);
		});
	});

	describe("objects", () => {
		test("compares empty objects", () => {
			expect(deepEqual({}, {})).toBe(true);
		});

		test("ignores key order", () => {
			expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
		});

		test("rejects a value mismatch", () => {
			expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
		});

		test("rejects a key-count mismatch", () => {
			expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
			expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
		});

		test("rejects a key that is missing on the other side", () => {
			expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
		});

		test("counts keys whose value is undefined", () => {
			expect(deepEqual({ a: undefined }, {})).toBe(false);
		});

		test("compares deeply nested structures", () => {
			const left = { a: { b: { c: [1, { d: 2 }] } }, e: "x" };
			const right = { a: { b: { c: [1, { d: 2 }] } }, e: "x" };
			expect(deepEqual(left, right)).toBe(true);
			expect(deepEqual(left, { ...right, a: { b: { c: [1, { d: 3 }] } } })).toBe(false);
			expect(deepEqual(left, { ...right, a: { b: { c: [1, { d: 2 }], extra: 1 } } })).toBe(false);
		});

		test("rejects a nested array/object type mismatch", () => {
			expect(deepEqual({ a: [1, 2] }, { a: { 0: 1, 1: 2 } })).toBe(false);
			expect(deepEqual({ a: [1, 2] }, { a: "1,2" })).toBe(false);
		});

		test("compares own enumerable keys only, ignoring the prototype chain", () => {
			const inherited = { own: 1 };
			Object.setPrototypeOf(inherited, { inherited: 9 });
			expect(deepEqual({ own: 1 }, inherited)).toBe(true);
			expect(deepEqual({ own: 1 }, { inherited: 9, own: 1 })).toBe(false);
		});
	});
});
