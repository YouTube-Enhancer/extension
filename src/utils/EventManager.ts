export type FeatureName =
	| "automaticTheaterMode"
	| "featureMenu"
	| "hideScrollBar"
	| "loopButton"
	| "maximizePlayerButton"
	| "playerQuality"
	| "playerSpeed"
	| "remainingTime"
	| "rememberVolume"
	| "screenshotButton"
	| "scrollWheelVolumeControl"
	| "videoHistory"
	| "volumeBoost";
type EventCallback<K extends keyof HTMLElementEventMap> = (event: HTMLElementEventMap[K]) => void;

export interface EventListenerInfo<K extends keyof HTMLElementEventMap> {
	callback: EventCallback<K>;
	eventName: K;
	target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
}

export type TargetedListeners<K extends keyof HTMLElementEventMap> = Map<HTMLElementTagNameMap[keyof HTMLElementTagNameMap], EventListenerInfo<K>>;

export type EventManager = {
	addEventListener: <K extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: K,
		callback: EventCallback<keyof HTMLElementEventMap>,
		featureName: FeatureName,
		options?: AddEventListenerOptions | boolean
	) => void;

	listeners: Map<string, TargetedListeners<keyof HTMLElementEventMap>>;

	removeAllEventListeners: (exclude?: FeatureName[]) => void;

	removeEventListener: <T extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: T,
		featureName: FeatureName
	) => void;

	removeEventListeners: (featureName: FeatureName) => void;
};

export const eventManager: EventManager = {
	// Map of feature names to a map of targets to
	// Adds an event listener for the given target, eventName, and featureName
	addEventListener: function (target, eventName, callback, featureName, options) {
		// Get the map of target listeners for the given featureName
		const targetListeners = this.listeners.get(featureName) || (new Map() as TargetedListeners<keyof HTMLElementEventMap>);
		// Store the event listener info object in the map
		targetListeners.set(target, { callback, eventName, target });
		// Store the map of target listeners for the given featureName
		this.listeners.set(featureName, targetListeners);
		// Add the event listener to the target
		target.addEventListener(eventName, callback, options);
	},

	// event listener info objects
	listeners: new Map(),

	// Removes all event listeners
	removeAllEventListeners: function (exclude) {
		// Remove all event listeners from all targets excluding the given feature names
		this.listeners.forEach((targetListeners, featureName) => {
			if (exclude && exclude.includes(featureName)) return;
			targetListeners.forEach(({ callback, eventName, target }) => {
				target.removeEventListener(eventName, callback);
			});
			this.listeners.delete(featureName);
		});
	},

	// Removes the event listener for the given target, eventName, and featureName
	removeEventListener: function (target, eventName, featureName) {
		// Get the map of target listeners for the given featureName
		const targetListeners = this.listeners.get(featureName);
		if (targetListeners) {
			// Get the event listener info object for the given target
			const listenerInfo = targetListeners.get(target);
			if (listenerInfo) {
				// Remove the event listener from the target
				target.removeEventListener(eventName, listenerInfo.callback);
				// Remove the event listener info object from the map
				targetListeners.delete(target);
			}
			if (targetListeners.size === 0) {
				// Remove the map of target listeners from the map
				this.listeners.delete(featureName);
			}
		}
	},

	// Removes all event listeners for the given featureName
	removeEventListeners: function (featureName) {
		// Get the map of target listeners for the given featureName
		const targetListeners = this.listeners.get(featureName);
		if (targetListeners) {
			// Remove all event listeners from their targets
			targetListeners.forEach(({ callback, eventName, target }) => {
				target.removeEventListener(eventName, callback);
			});
			// Remove the map of target listeners from the map
			this.listeners.delete(featureName);
		}
	}
};
export default eventManager;
