export type NotificationType = "error" | "success" | "info" | "warning";

export type NotificationAction = "reset_settings" | undefined;

export type Notification = {
	message: string;
	type: NotificationType;
	action: NotificationAction;
	removeAfterMs?: number;
	timestamp?: number;
	progress?: number;
};
