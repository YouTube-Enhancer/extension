export interface AudioEngine {
	context: AudioContext;
	input: AudioNode;
	monoEnabled: boolean;
	source: MediaElementAudioSourceNode;
	volumeGain: GainNode;
}

let engine: AudioEngine | null = null;

export function destroyAudioEngine(): void {
	if (!engine) return;
	engine.source.disconnect();
	engine.volumeGain.disconnect();
	void engine.context.close();
	engine = null;
}

export function getAudioEngine(video?: HTMLMediaElement): AudioEngine | null {
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

	engine = { context, input: source, monoEnabled: false, source, volumeGain };
	return engine;
}

function createAudioContext(): AudioContext {
	return window.AudioContext ? new AudioContext() : new (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext();
}
