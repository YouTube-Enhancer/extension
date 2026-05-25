# Contributing to YouTube Enhancer

## 🚀 Overview

This project enhances the YouTube viewing experience through a modular, highly customizable browser extension. It is built around isolated feature modules that integrate with the YouTube player lifecycle.

Contributions are welcome from developers interested in:

- Frontend architecture
- React + TypeScript
- Complex state and lifecycle management

---

## ⚡ Quick Start (TL;DR)

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Create a feature in `src/features/MyNewFeature/`:
   - `index.metadata.ts` → schema + settings UI + i18n
   - `index.ts` → lifecycle + logic

4. Add translations in `public/locales/`
5. Manually test on multiple YouTube pages
6. Submit a PR using Conventional Commits

---

## 🛠️ Development Setup

1. **Prerequisites:** Node.js and npm/yarn installed
2. **Install dependencies:** `npm install`
3. **Run dev server:** `npm run dev` (hot reload enabled)
4. **Testing:**
   Automated testing is planned. For now, all testing is **manual verification**.
   Your feature must be validated across multiple YouTube states (watch, live, navigation, etc.).

---

## 🏗️ Architecture Overview

```
Extension Core
    │
    ├── Feature Registry (auto-discovers features)
    │
    ├── Content Script (runs on YouTube pages)
    │
    ├── Popup/UI (options page)
    │
    └── Feature Modules (src/features/*)
         │
         ├── index.metadata.ts (config + schema + UI definition)
         └── index.ts (lifecycle + behavior)
```

---

## ✨ The Feature Contract (Blueprint)

Every feature must follow this contract to ensure consistency and stability.

### 1. Directory Structure

```
src/features/MyNewFeature/
```

---

### 2. Mandatory Files

- `index.metadata.ts` → configuration, schema, settings UI
- `index.ts` → feature logic and lifecycle

---

### 3. Implementation Steps

---

### Step 1: Update Global Configuration

- Open `src/types/index.ts`
- Add your feature:

```ts
myNewFeature: {
	enabled: boolean;
}
```

Why: Ensures the feature is globally recognized and configurable.

---

### Step 2: Define Metadata & Settings UI

- Create `index.metadata.ts`
- Use `createFeatureMetadata()`

#### Requirements

- `defaults` must include `enabled: false`
- `id` must match the feature folder name
- `schemaInput` must validate all settings
- `settings` defines UI (required)

#### i18n (Required)

All user-facing text must use the `t` function.

Why: Prevents hardcoded UI and enables localization.

---

### Example Pattern

```ts
import { z } from "zod/v4-mini";
import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false,
		someSetting: "defaultValue",
		anotherSetting: 5
	},
	id: "myNewFeature",
	schemaInput: {
		enabled: z.boolean(),
		someSetting: z.string(),
		anotherSetting: z.number().min(1).max(100)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.myNewFeature.title),
  settings: [
 		{
 			section: "myNewFeature",
 			type: "group",
 			children: [
 				{
 					component: "checkbox",
 					id: "enabled",
 					label: (t) => t((tr) => tr.settings.sections.myNewFeature.enable.label),
 					title: (t) => t((tr) => tr.settings.sections.myNewFeature.enable.title)
 				},
 				{
 					component: "input",
 					id: "someSetting",
 					label: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.someSetting.label),
 					title: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.someSetting.title)
 				},
 				{
 					component: "number",
 					id: "anotherSetting",
 					label: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.anotherSetting.label),
 					title: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.anotherSetting.title),
 					min: 1,
 					max: 100,
 					step: 1
 				}
 			]
 		}
 	]
```

📌 Add translations in:
`public/locales/en-US.json`

---

### Step 3: Implement Logic

- Create `index.ts`
- Import the metadata from "./index.metadata"
- Use `createFeature()` wrapper, spreading the metadata and adding lifecycle methods
- Export default:

```ts
import { createFeature } from "@/src/features/_registry/createFeature";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	// Add lifecycle methods here (onEnable, onDisable, onConfigChange, etc.)
	onEnable: (config) => {
		// Enable logic
	},
	onDisable: (config) => {
		// Disable/cleanup logic
	},
	onConfigChange: (config) => {
		// Handle config updates
	}
});
```

---

## ⚙️ Lifecycle Methods

| Method           | When it runs                        | Purpose                 | Notes                                           |
| ---------------- | ----------------------------------- | ----------------------- | ----------------------------------------------- |
| `onInit`         | Once per lifecycle (extension load) | Initial setup           | Use for observers or lightweight initialization |
| `onEnable`       | When feature is enabled             | Activate behavior       | Must be idempotent                              |
| `onDisable`      | When feature is disabled            | Cleanup                 | Remove DOM, listeners, timers, observers        |
| `onConfigChange` | When settings change                | React to config updates | Prefer incremental updates                      |
| `onNavigate`     | YouTube SPA navigation              | Re-sync behavior        | DOM resets on navigation                        |

---

## ⚠️ Common Mistakes

- Missing i18n (hardcoded strings)
- Forgetting `enabled: false` in defaults
- Missing cleanup in `onDisable`
- Direct state mutation instead of `stateAPI`
- Ignoring SPA navigation (`onNavigate`)
- Hardcoded UI placement instead of config-based rendering
- Forgetting to fully define `settings` array contents

---

## 🧪 Manual Testing Checklist

### Core Behavior

- Feature initializes correctly
- Enable/disable works
- Settings apply immediately

### Page Coverage

- Watch page
- Live streams
- Search results
- Channel pages

### Navigation

- Works across SPA navigation
- No duplicate DOM elements

### UI

- Buttons render correctly
- No layout glitches
- Interactions work as expected

### State

- Persists correctly (if enabled)
- Survives reloads (if configured)

### Performance

- No noticeable lag
- No excessive re-renders

---

## ⚛️ Advanced Patterns

### State Management

- Define in `FeatureState`
- Use `FeatureBaseWithState<K>`
- Access via `stateAPI`

Never mutate state directly.

---

### Messaging (Cross-Context)

Interaction between the content script, popups, or background services must use the specific functions exported from `src/utils/message`. Do not assume a general messaging bus.

- **Content $\to$ Content/Background:** Use `sendContentMessage(type, action, data?)` or `sendContentToBackgroundMessage(type, data?)` for directed communication.
- **Extension $\to$ Content:** Use `sendExtensionMessage(type, action, data?)` or `sendExtensionOnlyMessage(type, data)` when communicating from the extension side.
- **Listening:** Use `waitForSpecificMessage` to reliably listen for expected responses or events from other parts of the system.

Do not implement custom messaging systems.

---

### UI / DOM Interaction

#### Buttons

Buttons are defined in the `buttons` array passed to `createFeature()`. Each button object must include:

- `name`: A unique string identifier for the button.
- `add`: An async function that receives the feature's configuration. It should call `addFeatureButton(id, placement, label, icon, onClick, isToggle?)` to add the button and set up any necessary event listeners.
- `remove`: An async function that receives the button's placement. It should call `removeFeatureButton(id, placement)` to remove the button and clean up listeners.
- `shouldRender` (optional): A function that receives the feature's configuration and returns a boolean indicating whether the button should be rendered.
- **Critical:** Always clean up event listeners and remove buttons in the `remove` function to prevent memory leaks.
- **Example Pattern:**

```typescript
buttons: [
	{
		name: "myFeatureButton",
		add: async (config) => {
			await addFeatureButton(
				"myFeatureButton", // Button ID
				config.button.placement, // Placement from config
				window.i18nextInstance.t((t) => t.pages.content.features.myFeatureButton.button.label), // Initial label
				getFeatureIcon("myFeatureButton", config.button.placement), // Icon function
				(checked) => {
					// Handle click/toggle
				},
				true // Optional: set to true for toggle buttons
			);
			// Add event listeners here if needed
		},
		remove: async (placement) => {
			await removeFeatureButton("myFeatureButton", placement);
			// Remove event listeners here
		},
		shouldRender: (config) => {
			// Return true/false based on config
			return config.mode === "global";
		}
	}
];
```

---

#### DOM Utilities

Use helpers like:

- `createStyledElement(...)`, `conditionalStyles(...)`, `createSVGElement(...)`, `createTooltip(...)`, `modifyElementClassList(...)`, `modifyElementsClassList(...)`, `waitForElement(...)`, `waitForAllElements(...)`

Do not manually manipulate the DOM where utilities exist.

---

## 🧩 Architecture Guidelines

- Features must be fully encapsulated
- Shared logic goes in `src/utils/`
- Always clean up in `onDisable`
- Follow existing patterns (don’t introduce new ones unnecessarily)
- Avoid heavy logic in navigation/event loops

---

## ✅ Pull Request Requirements

- Follows Feature Contract
- Fully localized (no hardcoded strings)
- No console errors/warnings
- Manual testing completed
- No memory leaks
- Consistent with project structure

---

## 💾 Contribution Workflow

Follow a strict workflow cycle:

1.  **Branching:** Always create a new branch before working: `git checkout -b feature/your-feature-name`.
2.  **Development Cycle:** Implement small, focused changes. When designing logic, adopt the **Red-Green-Refactor** methodology.
3.  **Modification:** After implementing logic, first explore existing subdirectories in `src/utils/` (e.g., dom, format, logging, math, messaging, plugins, style, color, deep-dark-theme) to see if your utility fits into an existing category. If so, place it there. Otherwise, update `src/utils/utilities.ts` for general-purpose utilities.
4.  **Committing:** Commit only when the feature is functionally complete and manually verified.
5. **Conventional Commits:** All commits **must** follow the Conventional Commits specification (`type(scope): message`).
    - **feat:** For new features.
    - **fix:** For bug fixes.
    - **refactor:** For code restructuring without adding features or fixing bugs.
    - **chore:** For build scripts or tooling changes.
