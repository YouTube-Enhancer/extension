# Project Overview

This is a YouTube Enhancer browser extension that adds various features and customizations to the YouTube experience. It allows users to modify player behavior, UI elements, and functionality through a modular feature system.

# Architecture Overview

The project follows a modular architecture with a registry pattern for features. Features are organized as individual modules that can be registered and managed through a centralized system. The extension consists of multiple entry points (content script, popup, options page) that interact with the core feature system.

## Registry System

The extension uses a central `FeatureRegistry` to manage all features:

- **Registration**: All features are registered via `registerAllFeatures()` which imports and registers each feature module using a glob pattern
- **Execution Lifecycle**:
  1. `onInit` - runs once during initialization, regardless of enabled state
  2. `onEnable` - runs when feature is enabled (if implemented)
  3. `onDisable` - runs when feature is disabled (if implemented)
  4. `onConfigChange` - runs when configuration changes (if implemented)
- **Navigation Handling**: The registry listens to navigation changes and re-runs relevant features
- **Dependencies**: Features can specify page dependencies using `dependencies.includePages` or `dependencies.excludePages`
- **Buttons**: Features with buttons automatically handle placement logic based on configuration

## Feature Contract

Only modules that follow this contract qualify as features:

### Required Files (for true features):

1. `index.ts` - Main implementation module
2. `index.metadata.ts` - Metadata file created using `createFeatureMetadata`
3. Registered in the feature registry via `registerAllFeatures()`

### Lifecycle Methods:

- `onEnable(config)` - Runs when feature is enabled
- `onDisable(config)` - Runs when feature is disabled
- `onConfigChange(config)` - Runs when configuration changes
- `onInit(config)` - Runs once during initialization (optional)

### Registration Requirements:

1. Must be registered in the registry via `registry.register(feature)`
2. Must have a valid `metadata` object with `id`, `defaults`, and `schemaInput`
3. Must use the `createFeature()` wrapper function

### Constraints:

- Features must be independently toggleable via settings
- Features must implement lifecycle methods if they manage state or DOM changes
- Features must not directly modify global state without cleanup
- All features are idempotent - can be enabled/disabled multiple times

# Repository Structure

- `src/` - Main source code directory containing all components and logic
- `src/components/` - React components used in the UI
- `src/features/` - Individual feature modules implementing specific enhancements
- `src/pages/` - Entry points for different extension pages (content, popup, options)
- `src/utils/` - Utility functions and shared logic
- `src/hooks/` - Custom React hooks
- `public/` - Static assets including localization files

# Feature / Module Development

## True Features

New functionality must be added as modules in the `src/features/` directory following the feature contract:

1. A main implementation file (`index.ts`)
2. A metadata file (`index.metadata.ts`)
3. Proper registration through the feature registry system
4. Implementation of lifecycle methods if needed

## Supporting Modules (NOT Features)

Modules inside `src/features/` that are not features include:

- `src/features/buttonController/` - Button lifecycle management, split into:
  - `ButtonController.ts` - Button CRUD, tracked state, theme helpers
  - `containerTracking.ts` - Fullscreen/theater/geometry observers, container creation
  - `featureMenu.ts` - Menu DOM, event listeners, item management
- `src/features/featureMenu/` - Feature menu helpers
- `src/features/_registry/` - Feature registry system including `createCssToggleFeature` factory

These modules do not have registration in the feature registry and are not independently toggleable.

## Developer Rules

### What Qualifies as a Feature:

- Must be registered in the feature registry
- Implements lifecycle methods (`onEnable`, `onDisable`)
- Has feature metadata
- Is independently toggleable via settings
- Has a dedicated configuration schema

### When NOT to Create a Feature:

- For utility functions used across features
- For shared logic modules
- For UI helpers that don't manage state or DOM changes
- For modules that are only imported by other features

### Where to Put Shared Logic:

- Use `src/utils/` for general utilities
- Use `src/features/buttonController/` for button-related helpers
- Use `src/features/featureMenu/` for menu-related helpers

## CSS Toggle Features

Features that only toggle a CSS class on `document.body` should use the `createCssToggleFeature` factory:

```ts
import "./index.css";
import { metadata } from "./index.metadata";
import { createCssToggleFeature } from "@/src/features/_registry/createCssToggleFeature";
export default createCssToggleFeature(metadata);
```

The factory derives the CSS class from the feature ID (`yte-` + camelCase→kebab-case). Each feature still needs its own `index.css` and `index.metadata.ts` files.

## Button Features

Button features define a `buttons` array with `add` and optional `remove`/`onRemove` callbacks:

- `add(config)` - Required. Adds the button via `addFeatureButton`.
- `remove(placement)` - Optional. Overrides the default remove entirely.
- `onRemove(placement)` - Optional. Runs after the default remove for extra cleanup.

**Default remove behavior** (when `remove` is omitted): calls `removeFeatureButton(name, placement)` then `eventManager.removeEventListeners(featureId)`. Most features need no custom remove.

# Runtime Lifecycle

1. Extension initializes by registering all features through `registerAllFeatures()`
2. Feature registry loads user settings and applies them to enable/disable features
3. Content script runs on YouTube pages, while popup and options pages provide UI for configuration
4. Navigation changes trigger re-execution of relevant features
5. Features respond to configuration changes via `onConfigChange`

# Build and Dev Commands

- `npm install` - Install dependencies
- `npm run dev` - Watch mode with hot reload and HMR (`tsx src/pipeline/dev.ts`): both Vite builds stay running and write straight into `dist/Chrome` (`npm run dev:firefox` targets `dist/Firefox`). A WebSocket (preferred port 40251, a free one if Windows reserves it; the bound port is written to dev-reload.json in the output folder, which the worker reads on every connection attempt, and a ping every 20 s keeps the worker alive) tells the loaded development build what changed: an embedded-script change is swapped inside open YouTube tabs without a page reload (features are disabled and re-enabled in place), a content-script change is re-injected, and a background or manifest change reloads the extension. The options, popup and devtools pages are served from a Vite dev server (preferred port 40252) with React Fast Refresh, so a component edit applies in place; the manifest written in this mode allows that origin in `content_security_policy.extension_pages`, and Monaco's workers are created from the extension's own build. Chrome only; `--no-hmr` falls back to reloading the pages, `--no-hot-reload` turns the channel off. Release-only steps are skipped; the README feature list is still regenerated. Adding a new locale file needs a restart
- `npm run build` - Full build in one process (`tsx src/pipeline/build.ts`): pre-build checks, both Vite bundles in parallel, then manifests, output copies, README feature list, locale types and release ZIPs (ZIPs are skipped in development builds)
- `npm run build:pre` / `npm run build:bundle` / `npm run build:post` - The three pipeline stages on their own
- `npm run build:main` - Vite build for the extension pages only
- `npm run build:client` - Content and embedded script bundles only (`tsx src/pipeline/steps/buildContentScripts.ts`)
- `npm run build:locales` - Generate locale type definitions (`node node_modules/ts-json-as-const/index.js public/locales/en-US.json`). The output, `public/locales/en-US.json.d.ts`, is a generated file: it is gitignored and excluded from oxlint and prettier, so never edit or lint it by hand. The build regenerates it only when `en-US.json` is newer
- `npm run lint:readme` - Fails when README.md's feature list is stale; `npm run lint` runs it too. Every build regenerates the list, so commit README.md with a feature
- `npm run lint` - Run linter (oxlint, then a prettier check of the code files)
- `npm run lint:fix` - Run linter with auto-fix
- `npm run lint:i18n` - Lint i18n constants
- `npm run typecheck` - Regenerate the locale type definitions, then TypeScript type check (`tsc --noEmit -p tsconfig.json`)
- `npm run format` - Format code with prettier
- `npm run test` - Run tests

**Note:** Always use `npm run typecheck` instead of calling `tsc` directly. Use `npm run lint` and `npm run lint:fix` for linting.

# Code Conventions

- TypeScript is used throughout the project
- Features follow a consistent pattern with metadata files
- Component names use PascalCase
- Files are organized by feature or function
- Cross-module imports use the `@/src/...` alias, which is rooted at the src directory (for example `@/src/utils/dom/wait`); files in the same folder may import each other with `./`. Do not use `../` paths.
