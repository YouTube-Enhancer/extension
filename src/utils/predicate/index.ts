export const isIncludedIn = (array: unknown[]) => (item: unknown) => array.includes(item);

export const isNotStrictEqual = (value1: unknown) => (value2: unknown) => value1 !== value2;

export const isStrictEqual = (value1: unknown) => (value2: unknown) => value1 === value2;
