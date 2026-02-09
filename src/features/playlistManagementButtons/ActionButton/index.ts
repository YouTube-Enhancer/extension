import type { IconType } from "react-icons";
import type { TSelectorFunc } from "@/src/types";

import React from "react";
import { renderToString } from "react-dom/server";
import { FaSpinner } from "react-icons/fa";

import "./index.css";

import { type FeatureName } from "@/src/utils/EventManager";
import { createTooltip } from "@/src/utils/utilities";

interface ActionButtonConfig {
	className: string;
	featureName: FeatureName;
	icon: IconType;
	iconColor?: string;
	iconSize?: number;
	onClick: () => Promise<void>;
	translationError: TSelectorFunc;
	translationHover: TSelectorFunc;
	translationProcessing: TSelectorFunc;
}

export function createActionButton({
	className,
	featureName,
	icon,
	iconColor = "white",
	iconSize = 18,
	onClick,
	translationError,
	translationHover,
	translationProcessing
}: ActionButtonConfig): HTMLButtonElement {
	const button = document.createElement("button");
	button.innerHTML = renderToString(React.createElement(icon, { color: iconColor, size: iconSize }));
	button.className = className + " yte-action-button";
	button.title = window.i18nextInstance.t(translationHover);

	button.onclick = async () => {
		const { innerHTML: originalHTML, title: originalTitle } = button;
		button.disabled = true;
		button.title = window.i18nextInstance.t(translationProcessing);
		button.innerHTML = renderToString(React.createElement(FaSpinner, { size: iconSize }));
		button.classList.add("yte-spinning");

		try {
			await onClick();
		} catch (error) {
			const { listener } = createTooltip({
				element: button,
				featureName,
				id: `yte-feature-${featureName}-tooltip`,
				text: `${window.i18nextInstance.t(translationError)}: ${error instanceof Error ? error.message : String(error)}`
			});
			listener();
		} finally {
			button.disabled = false;
			button.innerHTML = originalHTML;
			button.title = originalTitle;
			button.classList.remove("yte-spinning");
		}
	};

	return button;
}
