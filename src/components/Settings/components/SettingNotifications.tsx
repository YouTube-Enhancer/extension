import type { Notification } from "@/src/types";

import { useNotifications } from "@/src/hooks";
import { cn } from "@/src/utils/utilities";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { useSettings } from "../Settings";
export default function SettingsNotifications() {
	const { notifications } = useNotifications();
	const [parentRef] = useAutoAnimate({ duration: 300 });
	return (
		<div id="notifications" ref={parentRef}>
			{notifications.map((notification, index) => (
				<ToastNotification key={index} notification={notification} />
			))}
		</div>
	);
}
function NotificationCloseButton({ notification }: { notification: Notification }) {
	const { removeNotification } = useNotifications();
	return (
		<button className="absolute -top-px right-[5px] text-base font-normal" onClick={() => removeNotification(notification)}>
			&times;
		</button>
	);
}
function ToastNotification({ key, notification }: { key: number; notification: Notification }) {
	const {
		i18nInstance: { t }
	} = useSettings();
	const message: string = t(notification.message);
	return (
		<div
			className={cn("notification inverse relative bg-teal-600", {
				"bg-blue-600": notification.type === "info",
				"bg-green-600": notification.type === "success",
				"bg-red-600": notification.type === "error",
				"bg-yellow-600": notification.type === "warning"
			})}
			key={key}
		>
			{notification.action ?
				notification.action === "reset_settings" ?
					<>
						{message.split("\n").map((line, index) => (
							<p key={index}>{line}</p>
						))}
						<NotificationCloseButton notification={notification} />
					</>
				:	null
			:	<>
					{message}
					<NotificationCloseButton notification={notification} />
				</>
			}
			<div
				className="absolute bottom-0 left-0 h-1 rounded-b bg-[#0086ff]"
				id={`${notification.type}_notification_${message.split(/s /).join("_")}_progress_bar`}
				key={key}
				style={{ width: `${notification.progress ?? 100}%` }}
			></div>
		</div>
	);
}
