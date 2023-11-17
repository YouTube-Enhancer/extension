import type { Notification, NotificationAction, NotificationType } from "@/src/types";

import { createContext } from "react";

export type NotificationsContextProps = {
	addNotification: (type: NotificationType, message: string, action?: NotificationAction) => void;
	notifications: Notification[];
	removeNotification: (notification: Notification) => void;
};
export const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);
