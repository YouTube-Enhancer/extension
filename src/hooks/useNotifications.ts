import { useState } from "react";
import { isNotStrictEqual } from "../utils/utilities";
type Notification = { message: string; type: "error" | "success" | "info" | "warning" };
export const useNotifications = (initialNotifications?: Notification[]) => {
	const [notifications, setNotifications] = useState<Notification[]>(initialNotifications ?? []);

	function addNotification(type: Notification["type"], message: Notification["message"]) {
		setNotifications((notifications) => {
			const notification = { message, type };
			const removeNotificationAfterMs = 2_500;

			setTimeout(() => {
				removeNotification(notification);
			}, removeNotificationAfterMs);

			return [notification, ...notifications];
		});
	}

	function removeNotification(notification: Notification) {
		setNotifications((notifications) => notifications.filter(isNotStrictEqual(notification)));
	}

	return { notifications, addNotification, removeNotification };
};
