export function createKeywordMatcher(keywords: string[]): (title: string) => boolean {
	const normalizedKeywords = Array.from(new Set(keywords.map(normalizeForMatch).filter((keyword) => keyword.length > 0)));
	if (normalizedKeywords.length === 0) return () => false;
	return (title: string) => {
		const normalizedTitle = normalizeForMatch(title);
		if (!normalizedTitle) return false;
		return normalizedKeywords.some((keyword) => normalizedTitle.includes(keyword));
	};
}

export function normalizeForMatch(text: string): string {
	return normalizeWhitespace(text).toLowerCase();
}

export function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}
