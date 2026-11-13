export function formatDateForFileName(date: Date): string {
	const dateFormatOptions: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	};

	const timeFormatOptions: Intl.DateTimeFormatOptions = {
		hour: "2-digit",
		hour12: false, // Ensure 24-hour time format
		minute: "2-digit",
		second: "2-digit"
	};

	// Get the user's locale
	const userLocale = navigator.language || "en-GB";

	const formattedDate = date.toLocaleDateString(userLocale, dateFormatOptions);
	const formattedTime = date.toLocaleTimeString(userLocale, timeFormatOptions);

	// Replace characters that can't be used in a filename
	const sanitizedDate = formattedDate.replace(/[\/]/g, "-");
	const sanitizedTime = formattedTime.replace(/[:]/g, "-");

	return `${sanitizedDate}_${sanitizedTime}`;
}
export function getFormattedTimestamp() {
	const now = new Date();

	const month = padDatePart(now.getMonth() + 1);
	const day = padDatePart(now.getDate());
	const year = now.getFullYear().toString().substr(-2);
	const hours = now.getHours();
	const minutes = padDatePart(now.getMinutes());
	const seconds = padDatePart(now.getSeconds());
	const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

	const period = hours >= 12 ? "PM" : "AM";
	const paddedHours = padDatePart(hours % 12 || 12); // Convert to 12-hour format and handle midnight (0 hours)

	return `${month}/${day}/${year} ${paddedHours}:${minutes}:${seconds}:${milliseconds} ${period}`;
}
/** Pads a number to two digits (month, day, hour, minute, second parts of a timestamp). */
export function padDatePart(value: number): string {
	return value.toString().padStart(2, "0");
}
