import { z } from "zod/v4-mini";

import { buttonPlacements, fullscreenPlacements } from "@/src/types";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ConfigShape = { [key: string]: Field<unknown, unknown> | {} };

export type ConfigShapeFrom<T extends Record<string, unknown>> = {
	[P in keyof T & string]: T[P] extends Record<string, unknown> ? ConfigShapeFrom<Extract<T[P], Record<string, unknown>>> : Field<T[P], T[P]>;
};

export type Field<out T, out D extends T = T> = {
	readonly _field: true;
	readonly default: D;
	readonly schema: z.ZodMiniType<T>;
};

export type InferType<T extends ConfigShape> = {
	[K in keyof T]: T[K] extends Field<infer V> ? V
	: T[K] extends ConfigShape ? InferType<T[K]>
	: never;
};

export function extractDefaults<T extends ConfigShape>(shape: T): InferType<T> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(shape as Record<string, unknown>)) {
		if (isField(value)) {
			const { default: defaultValue } = value;
			result[key] = defaultValue;
		} else {
			result[key] = extractDefaults(value as ConfigShape);
		}
	}
	return result as InferType<T>;
}

export function extractSchemaInput<T extends ConfigShape>(shape: T): Record<string, z.ZodMiniType<unknown>> {
	const result: Record<string, z.ZodMiniType<unknown>> = {};
	for (const [key, value] of Object.entries(shape as Record<string, unknown>)) {
		if (isField(value)) {
			const { schema } = value;
			result[key] = schema;
		} else {
			result[key] = z.object(extractSchemaInput(value as ConfigShape));
		}
	}
	return result;
}

export function field<T, D extends T>(schema: z.ZodMiniType<T>, defaultValue: D): Field<T, D> {
	return { _field: true, default: defaultValue, schema };
}

function isField(value: unknown): value is Field<unknown, unknown> {
	return typeof value === "object" && value !== null && "_field" in value;
}

export const buttonField = {
	enabled: field(z.boolean(), false),
	fullscreenPlacement: field(z.enum(fullscreenPlacements), "same" as const),
	placement: field(z.enum(buttonPlacements), "feature_menu" as const)
} satisfies ConfigShape;
