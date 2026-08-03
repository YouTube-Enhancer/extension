/**
 * Formats a duration in seconds into a string representation.
 *
 * @param {number} seconds - The duration in seconds.
 * @return {string} The formatted duration string in the format "HHhMMmSSs".
 */
export function formatDuration(seconds: number): string {
	// Calculate the hours, minutes, and seconds
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	// Format the hours, minutes, and seconds with leading zeros
	const formattedHours = hours.toString();
	const formattedMinutes = minutes.toString().padStart(2, "0");
	const formattedSeconds = secs.toString().padStart(2, "0");

	// Combine the formatted values into a single string
	return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
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
