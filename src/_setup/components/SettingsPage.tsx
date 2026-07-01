import type { JSX } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Settings from "@/src/components/Settings/Settings";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";
import { SettingsFilterProvider } from "@/src/hooks/useSettingsFilter/provider";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchInterval: 75,
			refetchOnWindowFocus: true,
			staleTime: 250
		}
	}
});

export function SettingsPage(): JSX.Element {
	return (
		<NotificationsProvider>
			<SettingsFilterProvider>
				<QueryClientProvider client={queryClient}>
					<Settings />
				</QueryClientProvider>
			</SettingsFilterProvider>
		</NotificationsProvider>
	);
}
