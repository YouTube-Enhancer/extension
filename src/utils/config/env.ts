export const DEV_MODE = process.env.NODE_ENV === "development";
export const ENABLE_SOURCE_MAP = DEV_MODE === true ? "inline" : false;
