export const SUPPORTED_YOUTUBE_HOSTNAMES = ["m.youtube.com", "www.youtube.com", "youtube.com"] as const;

export function isSupportedYouTubeHostname(hostname: string): boolean {
	return (SUPPORTED_YOUTUBE_HOSTNAMES as readonly string[]).includes(hostname.toLowerCase());
}

export const YOUTUBE_MATCH_PATTERNS = SUPPORTED_YOUTUBE_HOSTNAMES.map((hostname) => `https://${hostname}/*`);
