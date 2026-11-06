// How long the OSD keeps accumulating same-direction jumps before it starts a fresh display.
// Lives here so the specs can import the real value without pulling the feature module (and
// the registry's import.meta.glob) into Playwright's loader, which has no Vite transform.
export const OSD_ACCUMULATION_TIMEOUT = 800;
