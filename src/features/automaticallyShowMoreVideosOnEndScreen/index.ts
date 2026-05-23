import { createFeature } from "@/src/features/_registry/createFeature";
import { hideMoreVideosOnEndScreen, showMoreVideosOnEndScreen } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/utils";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: hideMoreVideosOnEndScreen,
	onEnable: showMoreVideosOnEndScreen
});
