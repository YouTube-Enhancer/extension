export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const round = (value: number, decimals = 0) => Number(`${Math.round(Number(`${value + Number.EPSILON}e${decimals}`))}e-${decimals}`);

export const toDivisible = (value: number, divider: number): number => Math.ceil(value / divider) * divider;
