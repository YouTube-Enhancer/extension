import { useNotifications } from "@/src/hooks";
import { cn } from "@/src/utils/utilities";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export default function SettingsNotifications() {
	const { notifications, removeNotification } = useNotifications();
	const [parentRef] = useAutoAnimate({ duration: 300 });
	return (
		<div id="notifications" ref={parentRef}>
			{notifications.map((notification, index) => (
				<div
					className={cn("relative notification inverse bg-teal-600", {
						"bg-green-600": notification.type === "success",
						"bg-red-600": notification.type === "error",
						"bg-blue-600": notification.type === "info",
						"bg-yellow-600": notification.type === "warning"
					})}
					key={index}
				>
					{notification.action ? (
						notification.action === "reset_settings" ? (
							<>
								{notification.message.split("\n").map((line, index) => (
									<p key={index}>{line}</p>
								))}
								<button className="text-base font-normal absolute top-[-1px] right-[5px]" onClick={() => removeNotification(notification)}>
									&times;
								</button>
							</>
						) : null
					) : (
						<>
							{notification.message}
							<button className="text-base font-normal absolute top-[-1px] right-[5px]" onClick={() => removeNotification(notification)}>
								&times;
							</button>
						</>
					)}
					<div
						className="h-1 bg-[#0086ff] absolute left-0 bottom-0 rounded-b"
						id={`${notification.type}_notification_${notification.message.split(/s /).join("_")}_progress_bar`}
						style={{ width: `${notification.progress ?? 100}%` }}
						key={index}
					></div>
				</div>
			))}
		</div>
	);
}
