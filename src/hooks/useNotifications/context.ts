import { createContext } from "react";

import type { Notification, NotificationAction, NotificationType } from "@/src/types";

export type AddNotification = (type: NotificationType, message: Notification["message"], action?: NotificationAction) => void;

export type CreateNotification = (type: NotificationType, message: Notification["message"], action?: NotificationAction) => Notification;
export type NotificationsContextProps = {
	addNotification: AddNotification;
	notifications: Notification[];
	removeNotification: RemoveNotification;
};

export type RemoveNotification = (notification: Notification) => void;
export type ScheduleNotificationRemoval = (notification: Notification, removeAfterMs?: number) => void;
export const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);
