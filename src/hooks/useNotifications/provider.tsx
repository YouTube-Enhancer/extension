import type { Notification } from "@/src/types";

import { isNotStrictEqual } from "@/src/utils/utilities";
import { type ReactElement, useEffect, useState } from "react";

import {
	type AddNotification,
	type CreateNotification,
	NotificationsContext,
	type NotificationsContextProps,
	type RemoveNotification,
	type ScheduleNotificationRemoval
} from "./context";
type NotificationProviderProps = { children: ReactElement | ReactElement[] };
export const NotificationsProvider = ({ children }: NotificationProviderProps) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const notificationIsEqual = (a: Notification, b: Notification) => {
		return a.type === b.type && a.message === b.message && a.action === b.action;
	};
	const createNotification: CreateNotification = (type, message, action) => {
		const removeNotificationAfterMs = action && action === "reset_settings" ? 15_000 : 5_000;
		const notification = { action, message, removeAfterMs: removeNotificationAfterMs, timestamp: +new Date(), type };

		return notification;
	};

	const scheduleNotificationRemoval: ScheduleNotificationRemoval = (notification, removeAfterMs) => {
		if (removeAfterMs) {
			setTimeout(() => {
				removeNotification(notification);
			}, removeAfterMs);
		}
	};
	const addNotification: AddNotification = (type, message, action) => {
		const notification = createNotification(type, message, action);
		const existingNotification = notifications.find((n) => notificationIsEqual(n, notification));
		if (existingNotification) return;

		setNotifications((notifications) => [notification, ...notifications]);
		scheduleNotificationRemoval(notification, notification.removeAfterMs);
	};
	const removeNotification: RemoveNotification = (notification) => {
		setNotifications((notifications) => notifications.filter(isNotStrictEqual(notification)));
	};
	useEffect(() => {
		let animationFrameId: null | number = null;
		const updateNotifications = () => {
			const now = Date.now();
			setNotifications((notifications) => {
				return notifications
					.map((notification) => {
						const timePassed = now - (notification.timestamp ?? now);
						const { removeAfterMs: progressBarDuration } = notification;
						const progress = Math.max(100 - (timePassed / (progressBarDuration ?? 3000)) * 100, 0);
						if (progress <= 0) {
							// Automatically hide the notification when progress reaches 0
							return null;
						}
						return {
							...notification,
							progress
						};
					})
					.filter(Boolean);
			});
			animationFrameId = requestAnimationFrame(updateNotifications);
		};
		updateNotifications();
		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, []);
	const contextValue = { addNotification, notifications, removeNotification } satisfies NotificationsContextProps;
	return <NotificationsContext.Provider value={contextValue}>{children}</NotificationsContext.Provider>;
};
