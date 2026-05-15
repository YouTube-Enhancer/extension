import type { ErrorInfo, ReactNode } from "react";

import { Component } from "react";

type Props = {
	children: ReactNode;
	onReset?: () => void;
};

type State = {
	error?: Error;
	hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { error, hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("[DevTools ErrorBoundary] Component crash caught:", error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] p-4 text-[#ff6b6b]">
					<h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
					<details className="mb-4 max-w-md text-sm">
						<summary className="cursor-pointer">Error details</summary>
						<pre className="mt-2 overflow-auto rounded bg-[#2d2d2d] p-2 text-xs text-[#d4d4d4]">
							{this.state.error?.stack ?? String(this.state.error)}
						</pre>
					</details>
					<button
						className="rounded bg-[#007acc] px-4 py-2 text-white hover:bg-[#0098ff]"
						onClick={() => {
							this.setState({ error: undefined, hasError: false });
							this.props.onReset?.();
						}}
					>
						Retry
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
