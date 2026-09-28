import type {
	ContentSendOnlyMessageMappings,
	ContentToBackgroundSendOnlyMessageMappings,
	ExtensionSendOnlyMessageMappings,
	MessageMappings,
	Messages,
	MessageSource
} from "@/src/types";

import { MESSAGE_ORIGIN } from "./index";

export type MessageHandler<T = unknown> = (data: T, requestId?: string) => Promise<void> | void;

export class MessageBus {
	private listeners = new Map<string, Set<MessageHandler>>();
	private sequence = 0;

	constructor(private source: MessageSource) {}

	on<T extends keyof MessageMappings>(type: T, handler: MessageHandler<MessageMappings[T]["request"] & { requestId?: string }>): () => void {
		const typeStr = type as string;
		if (!this.listeners.has(typeStr)) {
			this.listeners.set(typeStr, new Set());
		}
		this.listeners.get(typeStr)!.add(handler as MessageHandler);

		return () => {
			const handlers = this.listeners.get(typeStr);
			if (handlers) {
				handlers.delete(handler as MessageHandler);
				if (handlers.size === 0) this.listeners.delete(typeStr);
			}
		};
	}

	async request<T extends keyof MessageMappings>(
		type: T,
		data?: MessageMappings[T]["request"] extends { data: infer D } ? D : never,
		options?: { signal?: AbortSignal; timeout?: number }
	): Promise<MessageMappings[T]["response"]> {
		const { signal, timeout = 30_000 } = options ?? {};
		const requestId = crypto.randomUUID();
		const seq = ++this.sequence;
		const requestMessage = {
			action: "request_data" as const,
			data,
			origin: MESSAGE_ORIGIN,
			requestId,
			sequence: seq,
			source: this.source,
			type
		};

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
					const matchesAction = response?.action === "data_response";
					const matchesSource = response?.source === "extension";
					const matchesRequestId = response.requestId === requestId;
					const matchesType = response?.type === type;

					if (matchesAction && matchesSource && (matchesRequestId || matchesType)) {
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
					reject(new Error(`MessageBus.request timed out after ${timeout}ms waiting for "${String(type)}"`));
				}, timeout);
			}

			window.addEventListener("message", listener);
			window.postMessage(requestMessage, "*");
		});
	}

	send<T extends keyof ContentSendOnlyMessageMappings | keyof ContentToBackgroundSendOnlyMessageMappings | keyof ExtensionSendOnlyMessageMappings>(
		type: T,
		data: unknown,
		action: "request_action" | "send_data" = "send_data"
	): void {
		const seq = ++this.sequence;
		const message = {
			action,
			data,
			origin: MESSAGE_ORIGIN,
			sequence: seq,
			source: this.source,
			type
		};
		window.postMessage(message, "*");
	}

	sendResponse<T extends keyof MessageMappings>(
		type: T,
		data: MessageMappings[T]["response"] extends { data: infer D } ? D : never,
		requestId?: string
	): void {
		const seq = ++this.sequence;
		const message = {
			action: "data_response" as const,
			data,
			origin: MESSAGE_ORIGIN,
			requestId,
			sequence: seq,
			source: this.source,
			type
		};
		window.postMessage(message, "*");
	}

	start(): () => void {
		const listener = (event: MessageEvent) => {
			if (event.source !== window) return;
			const message = event.data as Messages["request"] | Messages["response"];
			if (message?.origin !== MESSAGE_ORIGIN) return;
			if (message.source === this.source) return;

			const { requestId, type } = message as { requestId?: string; type?: string };
			if (!type) return;

			const handlers = this.listeners.get(type);
			if (!handlers) return;

			for (const handler of handlers) {
				try {
					void handler(message, requestId);
				} catch (error) {
					console.error(`[MessageBus] Error in handler for "${type}":`, error);
				}
			}
		};

		window.addEventListener("message", listener);
		return () => window.removeEventListener("message", listener);
	}
}

export function createMessageBus(source: MessageSource): MessageBus {
	return new MessageBus(source);
}
