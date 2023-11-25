import type { Notification, NotificationAction, NotificationType } from "@/src/types";

import { isNotStrictEqual } from "@/src/utils/utilities";
import React, { type ReactElement, useEffect, useState } from "react";

import { NotificationsContext, type NotificationsContextProps } from "./context";
type NotificationProviderProps = { children: ReactElement | ReactElement[] };
export const NotificationsProvider = ({ children }: NotificationProviderProps) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	function addNotification(type: NotificationType, message: string, action?: NotificationAction) {
		const existingNotification = notifications.find((n) => n.message === message && n.type === type);
		if (existingNotification) {
			return;
		}

		const removeNotificationAfterMs = action && action === "reset_settings" ? 10_000 : 3_000;
		const notification = { action, message, removeAfterMs: removeNotificationAfterMs, timestamp: +new Date(), type } satisfies Notification;

		setNotifications((notifications) => [notification, ...notifications]);

		if (removeNotificationAfterMs) {
			setTimeout(() => {
				removeNotification(notification);
			}, removeNotificationAfterMs);
		}
	}
	function removeNotification(notification: Notification) {
		setNotifications((notifications) => notifications.filter(isNotStrictEqual(notification)));
	}
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
