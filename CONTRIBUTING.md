# Contributing to YouTube Enhancer

## 🚀 Overview

This project enhances the YouTube viewing experience through a modular, highly customizable browser extension. It is built around isolated feature modules that integrate with the YouTube player lifecycle.

Contributions are welcome from developers interested in:

- Frontend architecture
- React + TypeScript
- Complex state and lifecycle management

Non-developers can contribute too — see [Internationalization](#-internationalization-i18n) for translations.

---

## 🌐 Internationalization (i18n)

### Crowdin Translation Project

YouTube Enhancer supports multiple languages to provide a more inclusive experience for users around the world. We use [Crowdin](https://crowdin.com/project/youtube-enhancer) for managing translations.

### Contributing Translations

We welcome contributions to improve translations and make the extension accessible to a wider audience:

1. Visit our [Crowdin project](https://crowdin.com/project/youtube-enhancer)
2. Select your language and start translating
3. If your language is not listed, feel free to request its addition

---

## 🌿 Branching Strategy (Important)

All contributions **must** be based on the `dev` branch — **not** `main`.

- **`dev`** is the active development branch. All new features and bug fixes land here first.
- **`main`** is reserved for stable releases. It is updated only when `dev` is merged into it as part of cutting a new release.

```text
feature/your-feature ──► dev ──► main (release only)
```

What this means for you:

1. Fork/clone the repo and check out `dev`: `git checkout dev`
2. Create your working branch from `dev`: `git checkout -b feature/your-feature-name`
3. Open your PR targeting **`dev`**, never `main`

PRs opened against `main` will be asked to retarget `dev`.

---

## ⚡ Quick Start (TL;DR)

1. Check out `dev` and branch from it: `git checkout dev && git checkout -b feature/your-feature-name`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Create a feature in `src/features/myNewFeature/`:
   - `index.metadata.ts` → schema + settings UI + i18n
   - `index.ts` → lifecycle + logic

5. Add translations in `public/locales/`
6. Manually test on multiple YouTube pages
7. Submit a PR targeting `dev`, using Conventional Commits

---

## 🛠️ Development Setup

1. **Prerequisites:** Node.js and npm/yarn installed
2. **Install dependencies:** `npm install`
3. **Run dev server:** `npm run dev` (hot reload enabled)
4. **Testing:**
   Automated testing is planned. For now, all testing is **manual verification**.
   Your feature must be validated across multiple YouTube states (watch, live, navigation, etc.).

---

## 🔧 Code Quality

Before new code gets merged into the repository, automated lint tests verify the format of the code.

It is recommended to test your code before committing by running:

1. Lint check: `npm run lint`
2. Fix lint errors: `npm run lint:fix`

> You won't need to do this if you use a [supported editor](https://eslint.org/docs/latest/use/integrations#editors), as the process is automated.

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
src/features/myNewFeature/
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
- Add your feature to the `configuration` type:

```ts
// #region Configuration types
export type configuration = {
	// ... other existing features ...
	myNewFeature: {
		anotherSetting: number;
		enabled: boolean;
		someSetting: string;
	};
};
```

Why: Ensures the feature is globally recognized and configurable.

---

### Step 2: Define Metadata & Settings UI

- Create `index.metadata.ts`
- Use `createFeatureMetadata()` to define your feature metadata, and export it as a named `metadata` const. The feature registry discovers features by that exact export name.

#### Requirements

- `config` describes every setting as a `field(schema, defaultValue)` — the registry derives defaults and validation from it
- `config` must include an `enabled` field with a default of `false`
- `id` must match the feature folder name
- `settings` defines UI (required); setting ids are prefixed with the feature id (e.g. `myNewFeature.enabled`)

#### i18n (Required)

All user-facing text must use the `t` function.

Why: Prevents hardcoded UI and enables localization.

---

### Example Pattern

```ts
import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		someSetting: field(z.string(), "defaultValue"),
		anotherSetting: field(z.number(), 5)
	},
	id: "myNewFeature",
	sectionTitle: (t) => t((tr) => tr.settings.sections.myNewFeature.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "myNewFeature.enabled",
					label: (t) => t((tr) => tr.settings.sections.myNewFeature.enable.label),
					title: (t) => t((tr) => tr.settings.sections.myNewFeature.enable.title)
				},
				{
					component: "input",
					id: "myNewFeature.someSetting",
					label: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.someSetting.label),
					title: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.someSetting.title)
				},
				{
					component: "number",
					id: "myNewFeature.anotherSetting",
					label: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.anotherSetting.label),
					max: 100,
					min: 1,
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.myNewFeature.settings.anotherSetting.title)
				}
			],
			section: "myNewFeature",
			type: "group"
		}
	]
});
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
- Forgetting the `enabled` field (default `false`) in `config`
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
- [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [Rule of three](<https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)>)
- [Single source of truth](https://en.wikipedia.org/wiki/Single_source_of_truth)

---

## ✅ Pull Request Requirements

When creating [Bug Report issues](https://github.com/YouTube-Enhancer/extension/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=), follow the template and explain the issue in a clear and straightforward manner.

- Targets the `dev` branch (not `main`)
- Meaningful, descriptive title — Conventional Commits format is preferred for PR titles, though not strictly enforced
- Description briefly explains the goal of the PR and the changes it brings to the codebase
- Follows Feature Contract
- Fully localized (no hardcoded strings)
- No console errors/warnings
- Manual testing completed
- No memory leaks
- Consistent with project structure

---

## 💾 Contribution Workflow

Follow a strict workflow cycle:

1.  **Branching:** Always branch from `dev` — never from `main`. `dev` holds the latest features and fixes; `main` is only updated when `dev` is merged in for a release. Run: `git checkout dev && git checkout -b feature/your-feature-name`.
2.  **Development Cycle:** Implement small, focused changes. When designing logic, adopt the **Red-Green-Refactor** methodology.
3.  **Modification:** After implementing logic, first explore existing subdirectories in `src/utils/` (e.g., dom, format, logging, math, messaging, plugins, style, color, deep-dark-theme) to see if your utility fits into an existing category. If so, place it there. Otherwise, update `src/utils/utilities.ts` for general-purpose utilities.
4.  **Committing:** Commit only when the feature is functionally complete and manually verified.
5.  **Conventional Commits:** All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification (`type(scope): message`), with messages that meaningfully describe the change itself. Because our release CI/CD workflow is automated, we rely on this convention for semantic versioning ([why](https://www.conventionalcommits.org/en/v1.0.0/#why-use-conventional-commits)).
    - **feat:** For new features.
    - **fix:** For bug fixes.
    - **refactor:** For code restructuring without adding features or fixing bugs.
    - **chore:** For build scripts or tooling changes.
6.  **Pull Request:** Open your PR against the **`dev`** branch. PRs targeting `main` will be redirected to `dev`, as `main` is reserved for release merges.
