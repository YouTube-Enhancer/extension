import type { JSX } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PopupView from "@/src/pages/popup/PopupView";

export default function Popup(): JSX.Element {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				refetchInterval: 500,
				refetchOnWindowFocus: true,
				staleTime: 250
			}
		}
	});
	return (
		<QueryClientProvider client={client}>
			<PopupView />
		</QueryClientProvider>
	);
}
