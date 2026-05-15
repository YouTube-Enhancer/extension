export const screenshotTypes = ["file", "clipboard", "both"] as const;
export type ScreenshotType = (typeof screenshotTypes)[number];
export const screenshotFormats = ["png", "jpeg", "webp"] as const;
export type ScreenshotFormat = (typeof screenshotFormats)[number];
