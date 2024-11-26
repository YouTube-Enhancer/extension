import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";
const regexp: RegExp = new RegExp("(\\?|&)(si|feature|pp)=[^&]*", "g");
let intervalId: NodeJS.Timeout | null = null;
let input: HTMLInputElement | null;
function cleanUrl(url: string) {
	return url.replace(regexp, "");
}

function cleanAndUpdateUrl() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
		input = null;
	}
	intervalId = setInterval(() => {
		if (!input) return void (input = document.querySelector<HTMLInputElement>("#share-url"));
		if (!input.value.match(regexp)) return;
		console.log("cleanAndUpdateUrl");
		input.value = cleanUrl(input.value);
	}, 50);
}

function cleanSearchPage(url: string) {
	if (!url.match(/https?:\/\/(?:www\.)?youtube\.com\/results\?search\_query\=.+/gm)) return;
	const allElements = Array.from(document.querySelectorAll("*"));
	allElements.forEach((e) => {
		const href = e.getAttribute("href");
		if (!href || !href.match(/^\/watch\?v\=.+$/gm)) return;
		e.setAttribute("href", href.replace(regexp, ""));
	});
}

function handleInput(event: MouseEvent) {
	const element = event.target as Element;
	if (element.classList.contains("yt-spec-touch-feedback-shape__fill")) cleanAndUpdateUrl();
}

export async function enableShareShortener() {
	const {
		data: {
			options: { enable_share_shortener }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_share_shortener) return;
	cleanSearchPage(window.location.href);
	document.addEventListener("click", handleInput);
}

export function disableShareShortener() {
	browserColorLog(`Disabling share shortener`, "FgMagenta");
	document.removeEventListener("click", handleInput);
	if (!intervalId) return;
	clearInterval(intervalId);
	intervalId = null;
}
