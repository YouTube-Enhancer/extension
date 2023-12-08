import type { Notification } from "@/src/types";

import { isNotStrictEqual } from "@/src/utils/utilities";
import { type ReactElement, useEffect, useState } from "react";

import { type AddNotification, NotificationsContext, type NotificationsContextProps, type RemoveNotification } from "./context";
type NotificationProviderProps = { children: ReactElement | ReactElement[] };
export const NotificationsProvider = ({ children }: NotificationProviderProps) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	const addNotification: AddNotification = (type, message, action) => {
		const existingNotification = notifications.find((n) => n.message === message && n.type === type);
		if (existingNotification) {
			return;
		}

		const removeNotificationAfterMs = action && action === "reset_settings" ? 15_000 : 5_000;
		const notification = { action, message, removeAfterMs: removeNotificationAfterMs, timestamp: +new Date(), type } satisfies Notification;

		setNotifications((notifications) => [notification, ...notifications]);

		if (removeNotificationAfterMs) {
			setTimeout(() => {
				removeNotification(notification);
			}, removeNotificationAfterMs);
		}
	};
	const removeNotification: RemoveNotification = (notification) => {
		setNotifications((notifications) => notifications.filter(isNotStrictEqual(notification)));
	};
	useEffect(() => {
		const interval = setInterval(() => {
			setNotifications((notifications) => {
				return notifications
					.map((notification) => {
						const timePassed = Date.now() - (notification.timestamp ?? +new Date());
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
		}, 1);

		return () => clearInterval(interval);
	}, []);
	const contextValue = { addNotification, notifications, removeNotification } satisfies NotificationsContextProps;
	return <NotificationsContext.Provider value={contextValue}>{children}</NotificationsContext.Provider>;
};
