import type { IconType } from "react-icons";

import React from "react";
import { FaSpinner } from "react-icons/fa";

import type { FeatureName } from "@/src/events/EventManager";

import "./button.css";

import type { TSelectorFunc } from "@/src/types";

import { createSVGElement } from "@/src/utils/dom/elements";
import { createTooltip } from "@/src/utils/dom/tooltip";

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

interface IconRenderOptions {
	color?: string;
	size?: number | string;
	style?: React.CSSProperties;
}

interface IconSvgData extends IconRenderOptions {
	attr?: Record<string, number | string>;
	children?: React.ReactNode;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
	button.append(createIconSvg(icon, { color: iconColor, size: iconSize }));
	button.className = className + " yte-action-button";
	button.title = window.i18nextInstance.t(translationHover);

	button.onclick = async () => {
		const { title: originalTitle } = button;
		// Snapshot child nodes, not markup: re-parsing an HTML string would be a Trusted Types sink.
		const originalChildren = [...button.childNodes];
		button.disabled = true;
		button.title = window.i18nextInstance.t(translationProcessing);
		button.replaceChildren(createIconSvg(FaSpinner, { size: iconSize }));
		button.classList.add("yte-spinning");

		try {
			await onClick();
		} catch (error) {
			const { listener } = createTooltip({
				element: button,
				featureName,
				id: `yte-feature-${featureName}-tooltip`
			});
			button.dataset.title = `${window.i18nextInstance.t(translationError)}: ${error instanceof Error ? error.message : String(error)}`;
			listener();
		} finally {
			button.disabled = false;
			button.replaceChildren(...originalChildren);
			button.title = originalTitle;
			button.classList.remove("yte-spinning");
		}
	};

	return button;
}

/**
 * Builds the `<svg>` a react-icons icon renders to, mirroring react-icons' `IconBase` output
 * (the icon data's attributes, the fixed stroke/fill defaults, size and color) through DOM APIs
 * instead of an HTML string, so no Trusted Types policy is required to insert it.
 */
export function createIconSvg(icon: IconType, options: IconRenderOptions): SVGSVGElement {
	const iconElement = icon(options) as React.ReactElement<IconSvgData>;
	const { props } = iconElement;
	const { attr, children, color, size, style, ...rest } = props;
	const colorAttribute = color === undefined ? {} : { color };
	const svg = createSVGElement("svg", {
		...attr,
		...rest,
		...colorAttribute,
		fill: "currentColor",
		height: size || "1em",
		stroke: "currentColor",
		"stroke-width": "0",
		width: size || "1em"
	});
	svg.setAttribute("xmlns", SVG_NAMESPACE);
	Object.assign(svg.style, { ...colorAttribute, ...style });
	appendIconShapes(svg, children);
	return svg;
}

/**
 * Appends react-icons' icon tree (its static shape data) as real DOM nodes. Markup strings are
 * never parsed: `innerHTML`, `<template>.innerHTML` and `DOMParser.parseFromString` are all
 * Trusted Types sinks on pages that enforce `require-trusted-types-for 'script'`.
 */
function appendIconShapes(parent: Element, shapes: React.ReactNode): void {
	for (const node of React.Children.toArray(shapes)) {
		if (typeof node === "string" || typeof node === "number") {
			parent.appendChild(document.createTextNode(String(node)));
			continue;
		}
		if (!React.isValidElement(node)) continue;
		const { props, type } = node as React.ReactElement<{ children?: React.ReactNode }>;
		if (typeof type !== "string") continue;
		const shape = document.createElementNS(SVG_NAMESPACE, type);
		for (const [name, value] of Object.entries(props)) {
			if (name === "children" || name === "key" || name === "ref") continue;
			if (typeof value !== "string" && typeof value !== "number") continue;
			shape.setAttribute(name, String(value));
		}
		appendIconShapes(shape, props.children);
		parent.appendChild(shape);
	}
}
