import { describe, expect, test } from "vitest";

import type { ConstraintTree } from "@/src/validation/types";

import { buildNumberConstraints, validateNumbers } from "@/src/validation/rules";

/** The tolerance `validateNumbers` itself uses (EPSILON = 1e-8). */
const EPSILON = 1e-8;

/** The hard-coded core-feature constraint every tree is seeded with. */
const CORE_OSD_OPACITY = { onScreenDisplay: { opacity: { max: 100, min: 1 } } };

describe("validateNumbers", () => {
	describe("min", () => {
		test("throws when the value is below min", () => {
			expect(() => validateNumbers({ volume: 0 }, { volume: { min: 1 } })).toThrow(
				"volume must be >= 1"
			);
		});

		test("allows min itself", () => {
			expect(() => validateNumbers({ volume: 1 }, { volume: { min: 1 } })).not.toThrow();
		});

		test("tolerates an underflow smaller than EPSILON", () => {
			expect(() =>
				validateNumbers({ volume: 1 - EPSILON / 2 }, { volume: { min: 1 } })
			).not.toThrow();
		});

		test("throws for an underflow larger than EPSILON", () => {
			expect(() => validateNumbers({ volume: 1 - EPSILON * 10 }, { volume: { min: 1 } })).toThrow(
				"volume must be >= 1"
			);
		});
	});

	describe("max", () => {
		test("throws when the value is above max", () => {
			expect(() => validateNumbers({ volume: 101 }, { volume: { max: 100 } })).toThrow(
				"volume must be <= 100"
			);
		});

		test("allows max itself", () => {
			expect(() => validateNumbers({ volume: 100 }, { volume: { max: 100 } })).not.toThrow();
		});

		test("tolerates an overflow smaller than EPSILON", () => {
			expect(() =>
				validateNumbers({ volume: 100 + EPSILON / 2 }, { volume: { max: 100 } })
			).not.toThrow();
		});

		test("throws for an overflow larger than EPSILON", () => {
			expect(() =>
				validateNumbers({ volume: 100 + EPSILON * 10 }, { volume: { max: 100 } })
			).toThrow("volume must be <= 100");
		});
	});

	describe("step", () => {
		test("throws when the value is off-step", () => {
			expect(() => validateNumbers({ speed: 1.25 }, { speed: { min: 1, step: 0.5 } })).toThrow(
				"speed must be in steps of 0.5"
			);
		});

		test("allows values that land exactly on a step", () => {
			expect(() => validateNumbers({ speed: 2.5 }, { speed: { min: 1, step: 0.5 } })).not.toThrow();
		});

		test("tolerates a remainder within EPSILON of the next step", () => {
			expect(() =>
				validateNumbers({ speed: 2 - 1e-9 }, { speed: { min: 1, step: 0.5 } })
			).not.toThrow();
		});

		test("uses zero as the step base when min is absent", () => {
			expect(() => validateNumbers({ volume: 25 }, { volume: { step: 10 } })).toThrow(
				"volume must be in steps of 10"
			);
			expect(() => validateNumbers({ volume: 30 - 1e-9 }, { volume: { step: 10 } })).not.toThrow();
			expect(() => validateNumbers({ volume: 30 }, { volume: { step: 10 } })).not.toThrow();
		});

		test("checks step last, after min and max", () => {
			expect(() =>
				validateNumbers({ speed: 0 }, { speed: { max: 10, min: 1, step: 0.5 } })
			).toThrow("speed must be >= 1");
		});
	});

	describe("skipped values", () => {
		test("skips non-number values", () => {
			const constraints = { volume: { max: 10, min: 1, step: 1 } };
			expect(() => validateNumbers({ volume: "1" }, constraints)).not.toThrow();
			expect(() => validateNumbers({ volume: true }, constraints)).not.toThrow();
			expect(() => validateNumbers({ volume: null }, constraints)).not.toThrow();
			expect(() => validateNumbers({ volume: undefined }, constraints)).not.toThrow();
			expect(() => validateNumbers({}, constraints)).not.toThrow();
		});

		test("skips objects where a number is constrained", () => {
			expect(() =>
				validateNumbers({ speed: { min: 0 } }, { speed: { min: 1, step: 0.5 } })
			).not.toThrow();
		});

		test("skips inherited constraint keys", () => {
			const inherited: ConstraintTree = { injected: { min: 100 } };
			const constraints: ConstraintTree = {};
			Object.setPrototypeOf(constraints, inherited);
			expect(() => validateNumbers({ injected: 0 }, constraints)).not.toThrow();
		});
	});

	describe("nested trees", () => {
		test("reports the dotted path of the failing key", () => {
			expect(() =>
				validateNumbers({ player: { speed: 0 } }, { player: { speed: { min: 1 } } })
			).toThrow("player.speed must be >= 1");
		});

		test("accepts a nested value that passes", () => {
			expect(() =>
				validateNumbers({ player: { speed: 4 } }, { player: { speed: { max: 10, min: 1 } } })
			).not.toThrow();
		});

		test("descends three levels", () => {
			expect(() =>
				validateNumbers({ a: { b: { c: 9 } } }, { a: { b: { c: { max: 5 } } } })
			).toThrow("a.b.c must be <= 5");
		});

		test("skips a branch whose value is not a plain object", () => {
			const constraints = { player: { speed: { min: 1 } } };
			expect(() => validateNumbers({ player: [] }, constraints)).not.toThrow();
			expect(() => validateNumbers({ player: "off" }, constraints)).not.toThrow();
			expect(() => validateNumbers({ player: null }, constraints)).not.toThrow();
			expect(() => validateNumbers({ player: 7 }, constraints)).not.toThrow();
			expect(() => validateNumbers({}, constraints)).not.toThrow();
		});

		test("prefixes the label with an explicit path", () => {
			expect(() => validateNumbers({ a: 0 }, { a: { min: 1 } }, ["outer", 2])).toThrow(
				"outer.2.a must be >= 1"
			);
		});
	});
});

describe("buildNumberConstraints", () => {
	test("seeds the hard-coded core onScreenDisplay opacity constraint", () => {
		expect(buildNumberConstraints([])).toEqual(CORE_OSD_OPACITY);
	});

	test("extracts a single-segment id as a top-level key", () => {
		expect(buildNumberConstraints([{ component: "number", id: "flat", min: 5 }])).toEqual({
			...CORE_OSD_OPACITY,
			flat: { min: 5 }
		});
	});

	test("extracts nested paths from dotted ids", () => {
		expect(
			buildNumberConstraints([
				{ component: "number", id: "player.volume", max: 100, min: 0, step: 1 }
			])
		).toEqual({
			...CORE_OSD_OPACITY,
			player: { volume: { max: 100, min: 0, step: 1 } }
		});
	});

	test("merges siblings that share a path prefix", () => {
		expect(
			buildNumberConstraints([
				{ component: "number", id: "a.b", min: 1 },
				{ component: "number", id: "a.c", max: 9 }
			])
		).toEqual({ ...CORE_OSD_OPACITY, a: { b: { min: 1 }, c: { max: 9 } } });
	});

	test("recurses into groups", () => {
		expect(
			buildNumberConstraints([
				{
					children: [{ component: "slider", id: "nested.value", max: 2, min: 1, step: 0.5 }],
					type: "group"
				}
			])
		).toEqual({
			...CORE_OSD_OPACITY,
			nested: { value: { max: 2, min: 1, step: 0.5 } }
		});
	});

	test("ignores nodes that are not settings", () => {
		expect(
			buildNumberConstraints([
				{ type: "divider" },
				{ text: "label", type: "text" },
				{ type: 42 },
				null,
				"nonsense",
				42
			])
		).toEqual(CORE_OSD_OPACITY);
	});

	test("ignores setting nodes without a numeric component", () => {
		expect(
			buildNumberConstraints([
				{ component: "select", id: "pick.me", options: [] },
				{ id: "no.component" }
			])
		).toEqual(CORE_OSD_OPACITY);
	});

	test("ignores numeric components that define no constraints", () => {
		expect(buildNumberConstraints([{ component: "number", id: "empty.node" }])).toEqual(
			CORE_OSD_OPACITY
		);
	});

	test("lets the hard-coded core constraint override a metadata entry", () => {
		expect(
			buildNumberConstraints([
				{ component: "number", id: "onScreenDisplay.opacity", max: 50, min: 0, step: 5 }
			])
		).toEqual(CORE_OSD_OPACITY);
	});
});
