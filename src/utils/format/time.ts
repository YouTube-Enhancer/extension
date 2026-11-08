export type VideoTimestampFormat = "auto" | "hhmmss" | "mmss";
/**
 * Formats a duration in seconds since the start of the video as a timestamp. "auto" omits hours
 * when the duration is under an hour; "hhmmss" always shows all three units; "mmss" never shows
 * hours. The result is zero-padded per unit, floored to whole seconds, and never negative.
 * @param {number} seconds - The number of seconds.
 * @param {VideoTimestampFormat} format - The format to use.
 * @returns {string} The formatted timestamp.
 */
export function formatVideoTimestamp(
	seconds: number,
	format: VideoTimestampFormat = "auto"
): string {
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;
	const paddedHours = hours.toString().padStart(2, "0");
	const paddedMinutes = minutes.toString().padStart(2, "0");
	const paddedSeconds = secs.toString().padStart(2, "0");
	if (format === "hhmmss") {
		return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
	}
	if (format === "mmss") {
		return `${paddedMinutes}:${paddedSeconds}`;
	}
	if (hours > 0) {
		return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
	}
	return `${paddedMinutes}:${paddedSeconds}`;
}
/**
 * Converts a time string in the format "HH:MM:SS" to a number of seconds.
 * @param {string} timeString - The time string to convert.
 * @returns {number} The number of seconds represented by the time string.
 */
export function timeStringToSeconds(timeString: string): number {
	const parts = timeString.split(":").reverse();
	if (parts.length === 1) {
		return 0;
	}
	let seconds = 0;
	for (let i = 0; i < parts.length; i++) {
		seconds += parseInt(parts[i], 10) * Math.pow(60, i);
	}
	return seconds;
}
