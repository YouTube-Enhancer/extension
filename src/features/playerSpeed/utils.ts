export type ChannelSpeedEntry = { id: string; speed: number };

export function parseChannelSpeeds(value: string | undefined): Map<string, number> {
	const result = new Map<string, number>();
	for (const line of (value ?? "").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const separatorIndex = trimmed.indexOf(":");
		if (separatorIndex <= 0) continue;
		const id = trimmed.slice(0, separatorIndex).trim();
		const speed = Number(trimmed.slice(separatorIndex + 1).trim());
		if (id && Number.isFinite(speed)) result.set(id, speed);
	}
	return result;
}

export function serializeChannelSpeeds(entries: ChannelSpeedEntry[]): string {
	return entries.map(({ id, speed }) => `${id.trim()}:${Number.isFinite(speed) ? Math.round(speed * 10000) / 10000 : ""}`).join("\n");
}
