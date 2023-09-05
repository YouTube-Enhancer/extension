import { useEffect, useState } from "react";
import { isNotStrictEqual } from "../utils/utilities";
type NotificationType = "error" | "success" | "info" | "warning";

type NotificationAction = "reset_settings" | undefined;

type Notification = {
	message: string;
	type: NotificationType;
	action: NotificationAction;
	removeAfterMs?: number;
	timestamp?: number;
	progress?: number;
};
export const useNotifications = (initialNotifications?: Notification[]) => {
	const [notifications, setNotifications] = useState<Notification[]>(initialNotifications ?? []);

	function addNotification(type: NotificationType, message: string, action: NotificationAction = undefined) {
		const existingNotification = notifications.find((n) => n.message === message && n.type === type);
		if (existingNotification) {
			removeNotification(existingNotification);
		}

		const removeNotificationAfterMs = action && action === "reset_settings" ? 10_000 : 3_000;
		const notification = { message, type, action, timestamp: +new Date(), removeAfterMs: removeNotificationAfterMs } satisfies Notification;

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

	return { notifications, addNotification, removeNotification };
};
