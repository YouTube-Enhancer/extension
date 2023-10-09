export type FeatureName = "videoHistory" | "screenshotButton" | "maximizePlayerButton" | "scrollWheelVolumeControl";
type EventCallback<K extends keyof HTMLElementEventMap> = (event: HTMLElementEventMap[K]) => void;

export interface EventListenerInfo<K extends keyof ElementEventMap> {
	target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
	eventName: K;
	callback: EventCallback<K>;
}

export type TargetedListeners<K extends keyof ElementEventMap> = Map<HTMLElementTagNameMap[keyof HTMLElementTagNameMap], EventListenerInfo<K>>;

export type EventManager = {
	listeners: Map<string, TargetedListeners<keyof ElementEventMap>>;

	addEventListener: <T extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: T,
		callback: EventCallback<keyof HTMLElementEventMap>,
		featureName: FeatureName
	) => void;

	removeEventListener: <T extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: T,
		featureName: FeatureName
	) => void;

	removeEventListeners: (featureName: FeatureName) => void;

	removeAllEventListeners: () => void;
};

export const eventManager: EventManager = {
	// Map of feature names to a map of targets to
	// event listener info objects
	listeners: new Map(),

	// Adds an event listener for the given target, eventName, and featureName
	addEventListener: function (target, eventName, callback, featureName) {
		this.removeEventListener(target, eventName, featureName);
		// Get the map of target listeners for the given featureName
		const targetListeners = this.listeners.get(featureName) || new Map();
		// Store the event listener info object in the map
		targetListeners.set(target, { eventName, callback, target });
		// Store the map of target listeners for the given featureName
		this.listeners.set(featureName, targetListeners);
		// Add the event listener to the target
		target.addEventListener(eventName, callback);
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
			targetListeners.forEach(({ target, eventName, callback }) => {
				target.removeEventListener(eventName, callback);
			});
			// Remove the map of target listeners from the map
			this.listeners.delete(featureName);
		}
	},

	// Removes all event listeners
	removeAllEventListeners: function () {
		// Remove all event listeners from all targets
		this.listeners.forEach((targetListeners) => {
			targetListeners.forEach(({ target, eventName, callback }) => {
				target.removeEventListener(eventName, callback);
			});
		});
		// Remove all maps of target listeners from the map
		this.listeners.clear();
	}
};
export default eventManager;
