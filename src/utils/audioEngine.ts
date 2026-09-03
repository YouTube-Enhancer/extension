import type { Nullable } from "@/src/types";

export interface AudioEngine {
	context: AudioContext;
	input: AudioNode;
	monoEnabled: boolean;
	source: MediaElementAudioSourceNode;
	volumeGain: GainNode;
}

let visibilityHandler: (() => void) | null = null;

export function destroyAudioEngine(): void {
	const { engine } = window;
	if (!engine) return;
	engine.source.disconnect();
	engine.volumeGain.disconnect();
	teardownVisibilityResume();
	void engine.context.close();
	window.engine = null;
}

export function getAudioEngine(video?: HTMLMediaElement): Nullable<AudioEngine> {
	const { engine } = window;
	const player = video ?? document.querySelector<HTMLMediaElement>("video");
	if (!player) return null;
	// If we already have an engine for the same player, return it
	if (engine && engine.source.mediaElement === player) return engine;
	// If engine exists but the video changed, destroy the old one
	if (engine) destroyAudioEngine();
	const context = createAudioContext();
	const source = context.createMediaElementSource(player);
	const volumeGain = context.createGain();
	volumeGain.gain.value = 1;
	source.connect(volumeGain);
	volumeGain.connect(context.destination);
	setupVisibilityResume(context);

	const createdEngine: AudioEngine = { context, input: source, monoEnabled: false, source, volumeGain };
	window.engine = createdEngine;
	return createdEngine;
}

function createAudioContext(): AudioContext {
	return window.AudioContext ? new AudioContext() : new (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext();
}

function setupVisibilityResume(context: AudioContext): void {
	if (visibilityHandler) return;
	visibilityHandler = () => {
		if (!document.hidden && context.state === "suspended") {
			void context.resume();
		}
	};
	document.addEventListener("visibilitychange", visibilityHandler);
}

function teardownVisibilityResume(): void {
	if (!visibilityHandler) return;
	document.removeEventListener("visibilitychange", visibilityHandler);
	visibilityHandler = null;
}
