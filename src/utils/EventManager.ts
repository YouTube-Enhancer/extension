export interface EventListenerInfo<K extends keyof HTMLElementEventMap> {
	callback: EventCallback<K>;
	eventName: K;
	target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
}
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

export type FeatureName =
	| "automaticTheaterMode"
	| "copyTimestampUrlButton"
	| "featureMenu"
	| "forwardRewindButtons"
	| "hideEndScreenCardsButton"
	| "hideScrollBar"
	| "hideShorts"
	| "loopButton"
	| "maximizePlayerButton"
	| "miniPlayer"
	| "miniPlayerButton"
	| "openTranscriptButton"
	| "openYouTubeSettingsOnHover"
	| "playbackSpeedButtons"
	| "playerQuality"
	| "playerSpeed"
	| "playlistLength"
	| "playlistManagementButtons"
	| "remainingTime"
	| "rememberVolume"
	| "removeRedirect"
	| "saveToWatchLaterButton"
	| "screenshotButton"
	| "scrollWheelSpeedControl"
	| "scrollWheelVolumeControl"
	| "shareShortener"
	| "shortsAutoScroll"
	| "timestampPeek"
	| "videoHistory"
	| "volumeBoostButton";

export type TargetedListeners<K extends keyof HTMLElementEventMap> = Map<
	HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
	Map<K, EventListenerInfo<K>[]>
>;
type EventCallback<K extends keyof HTMLElementEventMap> = (event: HTMLElementEventMap[K]) => void;

export const eventManager: EventManager = {
	// Map of feature names to a map of targets to
	// Adds an event listener for the given target, eventName, and featureName
	addEventListener: function (target, eventName, callback, featureName, options) {
		// Get the map of listeners for the feature, or create it if it doesn't exist
		const targetListeners =
			this.listeners.get(featureName) ||
			new Map<HTMLElementTagNameMap[keyof HTMLElementTagNameMap], Map<keyof HTMLElementEventMap, EventListenerInfo<keyof HTMLElementEventMap>[]>>();
		// Get the map of listeners for the target element, or create it if it doesn't exist
		const eventListeners = targetListeners.get(target) || new Map<keyof HTMLElementEventMap, EventListenerInfo<keyof HTMLElementEventMap>[]>();
		// Get any existing listeners for the event, or create an empty array if it doesn't exist
		const existingListeners = eventListeners.get(eventName) || [];
		// See if the listener has already been added
		const existingListener = existingListeners.find((listener) => listener.callback === callback);
		// If the listener hasn't been added, add it
		if (!existingListener) {
			const listenerInfo: EventListenerInfo<keyof HTMLElementEventMap> = {
				callback,
				eventName,
				target
			};
			existingListeners.push(listenerInfo);
			eventListeners.set(eventName, existingListeners);
			targetListeners.set(target, eventListeners);
			this.listeners.set(featureName, targetListeners);
			target.addEventListener(eventName, callback, options);
		}
	},
	// event listener info objects
	listeners: new Map<string, TargetedListeners<keyof HTMLElementEventMap>>(),
	// Removes all event listeners
	removeAllEventListeners: function (exclude) {
		// Iterate over all registered listeners
		this.listeners.forEach((targetListeners, featureName) => {
			// If we have an exclude array and it contains the feature name, skip this feature
			if (!exclude || !exclude.includes(featureName)) {
				// Iterate over all listeners for this feature
				targetListeners.forEach((eventListeners, target) => {
					// Iterate over all event listeners for this target
					eventListeners.forEach((listeners, eventName) => {
						// Iterate over all listeners for this event on this target
						listeners.forEach(({ callback }) => {
							// Remove the listener from the target
							target.removeEventListener(eventName, callback);
						});
					});
				});
				// Remove the feature from the listeners map
				this.listeners.delete(featureName);
			}
		});
	},

	// Removes the event listener for the given target, eventName, and featureName
	removeEventListener: function (target, eventName, featureName) {
		// First we check if the feature name is in the map
		const targetListeners = this.listeners.get(featureName);
		// If it is, we check if the target is in the map
		if (targetListeners && targetListeners.has(target)) {
			// If it is, we check if the event is in the map
			const eventListeners = targetListeners.get(target);
			if (eventListeners && eventListeners.has(eventName)) {
				// If it is, we get the listeners
				const listeners = eventListeners.get(eventName);
				if (listeners) {
					// If we have listeners, we remove them
					listeners.forEach(({ callback }) => {
						target.removeEventListener(eventName, callback);
					});
					// And remove the event from the map
					eventListeners.delete(eventName);
					// If the event map is empty, we remove the target
					if (eventListeners.size === 0) {
						targetListeners.delete(target);
						// If the target map is empty, we remove the feature
						if (targetListeners.size === 0) {
							this.listeners.delete(featureName);
						}
					}
				}
			}
		}
	},

	// Removes all event listeners for the given featureName
	removeEventListeners: function (featureName) {
		// Get the set of listeners for the feature
		const targetListeners = this.listeners.get(featureName);
		// For each target that has listeners
		if (targetListeners) {
			targetListeners.forEach((eventListeners, target) => {
				// For each event name that has listeners
				eventListeners.forEach((listeners, eventName) => {
					// For each listener
					listeners.forEach(({ callback }) => {
						// Remove the listener from the target
						target.removeEventListener(eventName, callback);
					});
				});
			});
			// Remove the target listeners from the map
			this.listeners.delete(featureName);
		}
	}
};
export default eventManager;
