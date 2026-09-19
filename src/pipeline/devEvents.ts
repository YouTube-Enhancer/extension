/** Event bus of the watch pipeline: what was rebuilt, so the hot-reload server can tell the extension. */

export type RebuildEvent = {
	buildId: string;
	bundle: "content" | "embedded" | "manifest" | "pages" | "public";
	durationMs: number;
};

type RebuildListener = (event: RebuildEvent) => void;

const rebuildListeners = new Set<RebuildListener>();
let activeBuilds = 0;

export function buildFinished(): void {
	activeBuilds = Math.max(0, activeBuilds - 1);
}

export function buildStarted(): void {
	activeBuilds++;
}

export function emitRebuild(event: RebuildEvent): void {
	for (const listener of rebuildListeners) listener(event);
}

/**
 * True while any bundle is being rebuilt. One save often touches several bundles, which finish seconds apart; the
 * hot-reload server waits for all of them before announcing, otherwise the first announcement re-injects scripts whose
 * files on disk are still the old ones.
 */
export function isBuilding(): boolean {
	return activeBuilds > 0;
}

export function newBuildId(): string {
	return Date.now().toString(36);
}

/** Called after every completed rebuild, once the output on disk is consistent (manifest included). */
export function onRebuild(listener: RebuildListener): () => void {
	rebuildListeners.add(listener);
	return () => rebuildListeners.delete(listener);
}
