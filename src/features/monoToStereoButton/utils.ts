import type { Nullable } from "@/src/types";

import { getAudioEngine } from "@/src/utils/audioEngine";

let splitter: Nullable<ChannelSplitterNode> = null;
let merger: Nullable<ChannelMergerNode> = null;
let gainL: Nullable<GainNode> = null;
let gainR: Nullable<GainNode> = null;
let enabled = false;

export function disableMonoToStereo(): void {
	const engine = getAudioEngine();
	if (!engine || !enabled) return;

	engine.input.disconnect();
	engine.source.disconnect();

	engine.source.connect(engine.volumeGain);
	const { source } = engine;
	engine.input = source;
	engine.monoEnabled = false;
	enabled = false;

	splitter = null;
	merger = null;
	gainL = null;
	gainR = null;
}

export function enableMonoToStereo(): void {
	const engine = getAudioEngine();
	if (!engine || enabled) return;

	const { context, input, volumeGain } = engine;

	splitter = context.createChannelSplitter(1);
	merger = context.createChannelMerger(2);

	gainL = context.createGain();
	gainR = context.createGain();

	input.disconnect();

	input.connect(splitter);
	splitter.connect(gainL, 0);
	splitter.connect(gainR, 0);

	gainL.connect(merger, 0, 0);
	gainR.connect(merger, 0, 1);

	merger.connect(volumeGain);

	engine.input = merger;
	engine.monoEnabled = true;
	enabled = true;
}

export function isMonoStereoEnabled(): boolean {
	return enabled;
}
