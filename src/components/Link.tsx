import type { ReactNode } from "react";

import { cn } from "@/src/utils/utilities";

type LinkProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
	children: ReactNode;
	className?: string;
};
export default function Link({ children, className, ...props }: LinkProps) {
	return (
		<a {...props} className={cn("m-1 cursor-pointer hover:underline", className)}>
			{children}
		</a>
	);
}
