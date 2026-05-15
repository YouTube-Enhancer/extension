export const featureMenuOpenTypes = ["click", "hover"] as const;
export type FeatureMenuOpenType = (typeof featureMenuOpenTypes)[number];
