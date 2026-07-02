export type BasicIcon = SVGSVGElement;
export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;

export const featureMenuOpenTypes = ["click", "hover"] as const;
export type FeatureMenuOpenType = (typeof featureMenuOpenTypes)[number];
