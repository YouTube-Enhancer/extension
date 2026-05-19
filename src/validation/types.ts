import type { configuration } from "@/src/types";

export type ConfigurationNumericConstraints = Partial<NumbersOnly<configuration>>;
export type ConstraintTree = {
	[key: string]: ConstraintTree | NumberConstraint;
};
type IsEmptyObject<T> = keyof T extends never ? true : false;
type NumberConstraint = { max?: number; min?: number; step?: number };
/**
 * Recursively keeps ONLY numeric fields.
 * - number  -> NumberConstraint
 * - object  -> same object but filtered to numeric sub-keys
 * - anything else -> never (removed)
 */
type NumbersOnly<T> =
	T extends number ? NumberConstraint
	: T extends object ?
		Partial<
			RemoveEmpty<{
				[K in keyof T]: NumbersOnly<T[K]>;
			}>
		>
	:	never;
type RemoveEmpty<T> = {
	[K in keyof T as NonNullable<T[K]> extends never ? never
	: T[K] extends object ?
		IsEmptyObject<T[K]> extends true ?
			never
		:	K
	:	K]: T[K];
};
