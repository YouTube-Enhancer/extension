import "@/assets/styles/tailwind.css";
import "@/pages/devtools/index.css";
import React from "react";
import { createRoot } from "react-dom/client";

import DevTools from "@/pages/devtools/DevTools";

function init() {
	const rootContainer = document.querySelector("#__root");
	if (!rootContainer) throw new Error("Can't find DevTools root element");
	const root = createRoot(rootContainer);
	root.render(<DevTools />);
}

init();
