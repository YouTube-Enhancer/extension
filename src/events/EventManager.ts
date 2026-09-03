import type { FeatureKeys } from "@/src/features/_registry/types";
export interface EventListenerInfo {
	callback: EventListenerOrEventListenerObject;
	eventName: string;
	options?: AddEventListenerOptions | boolean;
	target: AcceptedTarget;
}
export type EventManager = {
	addEventListener: <K extends keyof AcceptedEventMap>(
		target: AcceptedTarget,
		eventName: K,
		callback: (event: AcceptedEventMap[K]) => void,
		featureName: FeatureName,
		options?: AddEventListenerOptions | boolean
	) => void;

	listeners: Map<string, TargetedListeners>;

	removeAllEventListeners: (exclude?: FeatureName[]) => void;

	removeEventListener: (target: AcceptedTarget, eventName: string, featureName: FeatureName) => void;

	removeEventListeners: (featureName: FeatureName) => void;

	removeEventListenersForTarget: (target: AcceptedTarget, featureName: FeatureName) => void;
};

export type FeatureName = ButtonNameEvents | CoreFeatureEvents | FeatureKeys;
export type TargetedListeners = Map<AcceptedTarget, Map<string, EventListenerInfo[]>>;
type AcceptedEventMap = DocumentEventMap & HTMLElementEventMap & WindowEventMap;

type AcceptedTarget = Document | HTMLElement | Window;

type ButtonNameEvents = "flipVideoHorizontalButton" | "flipVideoVerticalButton" | "volumeBoostButton";

type CoreFeatureEvents = "featureMenu" | "scrollWheelController";

const eventManager: EventManager = {
	// Map of feature names to a map of targets to
	// Adds an event listener for the given target, eventName, and featureName
	addEventListener: function (target, eventName, callback, featureName, options) {
		// Get the map of listeners for the feature, or create it if it doesn't exist
		const targetListeners = this.listeners.get(featureName) || new Map<AcceptedTarget, Map<string, EventListenerInfo[]>>();
		// Get the map of listeners for the target element, or create it if it doesn't exist
		const eventListeners = targetListeners.get(target) || new Map<string, EventListenerInfo[]>();
		// Get any existing listeners for the event, or create an empty array if it doesn't exist
		const existingListeners = eventListeners.get(eventName) || [];
		// See if the listener has already been added
		const existingListener = existingListeners.find((listener) => listener.callback === callback);
		// If the listener hasn't been added, add it
		if (!existingListener) {
			const listenerInfo: EventListenerInfo = {
				callback: callback as EventListenerOrEventListenerObject,
				eventName,
				options,
				target
			};
			existingListeners.push(listenerInfo);
			eventListeners.set(eventName, existingListeners);
			targetListeners.set(target, eventListeners);
			this.listeners.set(featureName, targetListeners);
			target.addEventListener(eventName, callback as EventListenerOrEventListenerObject, options);
		}
	},

	// event listener info objects
	listeners: new Map<string, TargetedListeners>(),
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
						listeners.forEach(({ callback, options }) => {
							// Remove the listener from the target
							target.removeEventListener(eventName, callback, options);
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
					listeners.forEach(({ callback, options }) => {
						target.removeEventListener(eventName, callback, options);
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
					listeners.forEach(({ callback, options }) => {
						// Remove the listener from the target
						target.removeEventListener(eventName, callback, options);
					});
				});
			});
			// Remove the target listeners from the map
			this.listeners.delete(featureName);
		}
	},

	// Removes every event listener the given featureName registered on the given target, leaving the
	// listeners it registered on its other targets alone
	removeEventListenersForTarget: function (target, featureName) {
		// Get the set of listeners for the feature
		const targetListeners = this.listeners.get(featureName);
		if (!targetListeners) return;
		// Get the listeners for this target only
		const eventListeners = targetListeners.get(target);
		if (!eventListeners) return;
		// For each event name that has listeners
		eventListeners.forEach((listeners, eventName) => {
			// For each listener
			listeners.forEach(({ callback, options }) => {
				// Remove the listener from the target
				target.removeEventListener(eventName, callback, options);
			});
		});
		// Remove the target from the feature's map
		targetListeners.delete(target);
		// If the feature has no targets left, remove it as well
		if (targetListeners.size === 0) this.listeners.delete(featureName);
	}
};
export default eventManager;
