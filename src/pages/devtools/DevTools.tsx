import type { JSX } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DevToolsPanel from "@/src/components/devtools";
import { ErrorBoundary } from "@/src/components/devtools/components/ErrorBoundary";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: true,
			retry: 1
		}
	}
});

export default function DevTools(): JSX.Element {
	return (
		<NotificationsProvider>
			<QueryClientProvider client={queryClient}>
				<ErrorBoundary onReset={() => window.location.reload()}>
					<DevToolsPanel />
				</ErrorBoundary>
			</QueryClientProvider>
		</NotificationsProvider>
	);
}
