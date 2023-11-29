import Settings from "@/src/components/Settings/Settings";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";
import React from "react";

export default function Options(): JSX.Element {
	return (
		<NotificationsProvider>
			<Settings />
		</NotificationsProvider>
	);
}
