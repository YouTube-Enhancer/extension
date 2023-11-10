import { createContext } from "react";
import type { NotificationType, NotificationAction, Notification } from "./types";

export type NotificationsContextProps = {
	notifications: Notification[];
	addNotification: (type: NotificationType, message: string, action?: NotificationAction) => void;
	removeNotification: (notification: Notification) => void;
};
export const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);
