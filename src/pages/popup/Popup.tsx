import Settings from "@/src/components/Settings/Settings";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";
import { SettingsFilterProvider } from "@/src/hooks/useSettingsFilter/provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Options(): JSX.Element {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				refetchInterval: 75,
				refetchOnWindowFocus: true,
				staleTime: 250
			}
		}
	});
	return (
		<NotificationsProvider>
			<SettingsFilterProvider>
				<QueryClientProvider client={client}>
					<Settings />
				</QueryClientProvider>
			</SettingsFilterProvider>
		</NotificationsProvider>
	);
}
