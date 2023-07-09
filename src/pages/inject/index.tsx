import { configuration, configurationWithDefaults, MessageData, MessageTypes } from "@/src/types";
import { parseReviver } from "@/src/utils/utilities";

const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/pages/content/index.js");
script.type = "text/javascript";
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-extension";
document.documentElement.appendChild(element);
document.documentElement.appendChild(script);

function sendMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">) {
	const message: Omit<MessageData<typeof eventType>, "type"> = {
		type: eventType,
		source: "extension",
		...data
	};
	const stringifiedMessage = JSON.stringify(message);
	element.textContent = stringifiedMessage;
	document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
}

document.addEventListener("yte-message-from-youtube", async () => {
	const provider = document.querySelector("#yte-message-from-youtube");
	if (!provider) return;
	const { textContent: stringifiedMessage } = provider;
	if (!stringifiedMessage) return;
	let message;
	try {
		message = JSON.parse(stringifiedMessage) as MessageData<MessageTypes>;
	} catch (error) {
		console.error(error);
		return;
	}
	if (!message) return;
	document.dispatchEvent(new Event("yte-extension-read-message"));
	switch (message.type) {
		case "options": {
			const options: configuration = await new Promise((resolve) => {
				chrome.storage.local.get((o) => {
					resolve(JSON.parse(JSON.stringify(o), parseReviver) as configurationWithDefaults);
				});
			});
			sendMessage("options", { options, source: "extension" });
			break;
		}

		case "setVolume": {
			chrome.storage.local.set({ remembered_volume: message.volume });
			break;
		}
	}
});
