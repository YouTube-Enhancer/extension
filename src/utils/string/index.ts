import Fuse from "fuse.js";
type FuzzyMatchOptions = {
	includeScore?: boolean;
	threshold?: number;
};

/** Splits a newline-separated list into trimmed, non-empty entries. */
export function parseLineList(value: string | undefined): string[] {
	return (value ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export function removeSpecialCharacters(value: string) {
	return value.replace(/[<>:"|?*]/g, "");
}

/** Joins entries into the newline-separated form parsed by parseLineList. */
export function serializeLineList(items: string[]): string {
	return items.map((item) => item.trim()).join("\n");
}

export function unique(values: string[]) {
	return [...new Set(values)];
}

const DEFAULT_OPTIONS: FuzzyMatchOptions = {
	includeScore: false,
	threshold: 0.2
};

export function fuzzyIncludes(text: string, search: string, threshold = DEFAULT_OPTIONS.threshold): boolean {
	if (!text || !search) return false;
	const textLower = text.toLowerCase();
	const searchLower = search.toLowerCase();
	if (textLower.includes(searchLower)) return true;
	if (searchLower.length < 2) return false;
	const fuse = new Fuse([text], {
		findAllMatches: true,
		ignoreLocation: true,
		minMatchCharLength: 2,
		threshold
	});
	const results = fuse.search(searchLower);
	return results.length > 0;
}
export const textMatcher = (filter: string) => {
	return (text: string) => {
		if (!text) return false;
		const textLower = text.toLowerCase();
		const filterLower = filter.toLowerCase();
		if (textLower.includes(filterLower)) return true;
		return filterLower.length >= 3 && fuzzyIncludes(text, filter, DEFAULT_OPTIONS.threshold);
	};
};
