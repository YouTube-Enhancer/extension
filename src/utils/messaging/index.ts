import type {
	ActionMessage,
	ContentSendOnlyMessageMappings,
	ContentToBackgroundSendOnlyMessageMappings,
	ExtensionSendOnlyMessageMappings,
	MessageMappings,
	Messages,
	MessageSource,
	SendDataMessage
} from "@/src/types";

export const MESSAGE_ORIGIN = "yte-messaging" as const;

/**
 * Sends a message from the content
 * @param type - The type of the message to send.
 * @param action - The action of the message
 * @param data - The message data.
 * @returns A promise that resolves to the response data.
 */
export function sendContentMessage<T extends keyof MessageMappings, D>(
	type: T,
	action: MessageMappings[keyof MessageMappings]["request"]["action"],
	data?: D
): Promise<void> {
	const message = {
		action,
		data,
		origin: MESSAGE_ORIGIN,
		source: "content",
		type
	};
	return new Promise((resolve) => {
		window.postMessage(message, "*");
		resolve();
	});
}
/**
 * Sends a content send-only message.
 * @param type - The type of the message to send.
 * @param data - The message data.
 */
export function sendContentOnlyMessage<T extends keyof ContentSendOnlyMessageMappings>(type: T, data: ContentSendOnlyMessageMappings[T]["data"]) {
	const message: SendDataMessage<"send_data", "content", T, typeof data> = {
		action: "send_data",
		data,
		origin: MESSAGE_ORIGIN,
		source: "content",
		type
	};
	window.postMessage(message, "*");
}
/**
 * Sends a content message to the background.
 *
 * @param {T} type - The type of the content message.
 * @param {ContentToBackgroundSendOnlyMessageMappings[T]["data"]} data - The data of the content message.
 * @return {Promise<void>} A promise that resolves when the message is sent.
 */
export function sendContentToBackgroundMessage<T extends keyof ContentToBackgroundSendOnlyMessageMappings>(
	type: T,
	data?: ContentToBackgroundSendOnlyMessageMappings[T]["data"]
): Promise<void> {
	const message: ActionMessage<T, typeof data> = {
		action: "request_action",
		data,
		origin: MESSAGE_ORIGIN,
		source: "content",
		type
	};
	return new Promise((resolve) => {
		window.postMessage(message, "*");
		resolve();
	});
}
/**
 * Sends a message from the extension
 * @param type - The type of the message to send.
 * @param action - The action of the message
 * @param data - The message data.
 * @returns A promise that resolves to the response data.
 */
export function sendExtensionMessage<T extends keyof MessageMappings, D>(
	type: T,
	action: MessageMappings[keyof MessageMappings]["response"]["action"],
	data?: D
): Promise<void> {
	const message = {
		action,
		data,
		origin: MESSAGE_ORIGIN,
		source: "extension",
		type
	};
	return new Promise((resolve) => {
		window.postMessage(message, "*");
		resolve();
	});
}
/**
 * Sends an extension send-only message.
 * @param type - The type of the message to send.
 * @param data - The message data.
 */
export function sendExtensionOnlyMessage<T extends keyof ExtensionSendOnlyMessageMappings>(
	type: T,
	data: ExtensionSendOnlyMessageMappings[T]["data"]
) {
	const message: SendDataMessage<"send_data", "extension", T, typeof data> = {
		action: "send_data",
		data,
		origin: MESSAGE_ORIGIN,
		source: "extension",
		type
	};
	window.postMessage(message, "*");
}
/**
 * Waits for a specific message of the given type, action, source, and data.
 *
 * @param type - The type of the message to wait for.
 * @param action - The action of the message.
 * @param source - The source of the message.
 * @param data - Optional message data.
 * @param options - Optional settings: timeout in ms (default 30s), AbortSignal for cancellation.
 */
export function waitForSpecificMessage<T extends keyof MessageMappings, S extends MessageSource, D>(
	type: T,
	action: MessageMappings[T]["request"]["action"],
	source: S,
	data?: D,
	options?: { signal?: AbortSignal; timeout?: number }
): Promise<MessageMappings[T]["response"]> {
	const { signal, timeout = 30_000 } = options ?? {};
	const requestMessage = { action, data, origin: MESSAGE_ORIGIN, source, type };
	return new Promise<MessageMappings[T]["response"]>((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("Aborted", { cause: signal.reason }));
			return;
		}

		let timer: ReturnType<typeof setTimeout> | undefined;

		const listener = (event: MessageEvent) => {
			if (event.source !== window) return;
			const response = event.data as Messages["response"];
			if (response?.origin !== MESSAGE_ORIGIN) return;
			try {
				const matchesType = response?.type === type;
				const matchesAction = response?.action === "data_response";
				const matchesSource = response?.source === "extension";
				const matchesData =
					!data ||
					(typeof data === "object" &&
						typeof response.data === "object" &&
						data !== null &&
						response.data !== null &&
						Object.entries(data).every(([key, value]) => (key in response.data ? response.data[key] === value : false)));

				if (matchesType && matchesAction && matchesSource && matchesData) {
					cleanup();
					resolve(response);
				}
			} catch {
				// Ignore invalid messages
			}
		};

		const cleanup = () => {
			window.removeEventListener("message", listener);
			if (timer !== undefined) clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			cleanup();
			reject(new Error("Aborted", { cause: signal!.reason }));
		};

		if (signal) signal.addEventListener("abort", onAbort, { once: true });

		if (timeout !== Infinity) {
			timer = setTimeout(() => {
				cleanup();
				reject(new Error(`waitForSpecificMessage timed out after ${timeout}ms waiting for "${String(type)}"`));
			}, timeout);
		}

		window.addEventListener("message", listener);
		window.postMessage(requestMessage, "*");
	});
}
