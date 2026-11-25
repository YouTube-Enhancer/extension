import type { Nullable } from "@/src/types";

/**
 * Playlist id of the page the extension is on (`?list=`), shared by playlistLength and
 * playlistManagementButtons — extracted here so features do not import each other's internals
 * (AGENTS.md: shared logic lives in `src/utils/`).
 */
export function getPlaylistId(): Nullable<string> {
	return new URLSearchParams(window.location.search).get("list");
}
