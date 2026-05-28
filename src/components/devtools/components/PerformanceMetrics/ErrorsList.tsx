import type { JSX } from "react";

import type { FeatureError } from "./types";

import { formatError } from "./utils";

type ErrorsListProps = {
	errors: FeatureError[];
};

export default function ErrorsList({ errors }: ErrorsListProps): JSX.Element {
	return (
		<div className="space-y-2">
			{errors.length === 0 ?
				<div className="py-8 text-center text-[#4ec9b0]">No errors recorded</div>
			:	errors.map((error, index) => (
					<div className="rounded border border-[#ce9178] bg-[#3d2a2a] p-3" key={index}>
						<div className="flex items-center gap-3">
							<span className="font-medium text-[#ce9178]">{error.id}</span>
							<span className="text-xs text-[#6b6b6b]">{error.operation}</span>
						</div>
						<details className="mt-2">
							<summary className="cursor-pointer text-xs text-[#ce9178] hover:text-[#d4d4d4]">Error Details</summary>
							<pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-[#d4d4d4]">{formatError(error.error)}</pre>
						</details>
					</div>
				))
			}
		</div>
	);
}
