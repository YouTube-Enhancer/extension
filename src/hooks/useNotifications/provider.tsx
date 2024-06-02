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
		const notification = { action, message, removeAfterMs: removeNotificationAfterMs, timestamp: +new Date(), type } satisfies Notification;

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
			setNotifications((prevNotifications) => {
				if (prevNotifications.length === 0) return prevNotifications;
				return prevNotifications.reduce((acc: Notification[], notification) => {
					const elapsed = now - (notification.timestamp ?? now);
					const progress = Math.max(100 - (elapsed / (notification.removeAfterMs ?? 3000)) * 100, 0);
					if (progress > 0) {
						acc.push({ ...notification, progress });
					}
					return acc;
				}, []);
			});
			animationFrameId = requestAnimationFrame(updateNotifications);
		};
		updateNotifications();
		return () => {
			if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
		};
	}, []);
	const contextValue = { addNotification, notifications, removeNotification } satisfies NotificationsContextProps;
	return <NotificationsContext.Provider value={contextValue}>{children}</NotificationsContext.Provider>;
};
