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

- UI helpers (e.g., `featureMenu`, `buttonPlacement`)
- Placement/positioning utilities (e.g., `buttonPlacement`)
- Shared logic used across features
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
- Use `src/features/buttonPlacement/` for button-related helpers
- Use `src/features/featureMenu/` for menu-related helpers

# Runtime Lifecycle

1. Extension initializes by registering all features through `registerAllFeatures()`
2. Feature registry loads user settings and applies them to enable/disable features
3. Content script runs on YouTube pages, while popup and options pages provide UI for configuration
4. Navigation changes trigger re-execution of relevant features
5. Features respond to configuration changes via `onConfigChange`

# Build and Dev Commands

- `npm install` - Install dependencies
- `npm run dev` - Development build with hot reloading (uses nodemon)
- `npm run build` - Production build (runs `tsx src/pipeline/runBuilds.ts`)
- `npm run build:main` - Vite build for main extension bundle
- `npm run build:client` - Build content scripts (`tsx src/pipeline/steps/buildContentScripts.ts`)
- `npm run build:pre` / `npm run build:post` - Pre/post build steps
- `npm run build:post-pipeline` - Post-build pipeline (`tsx src/pipeline/build.ts post`)
- `npm run build:locales` - Generate locale type definitions (`node node_modules/ts-json-as-const/index.js public/locales/en-US.json`)
- `npm run lint` - Run linter (eslint with cache)
- `npm run lint:fix` - Run linter with auto-fix
- `npm run lint:locales` - Lint locale files
- `npm run lint:i18n` - Lint i18n constants
- `npm run typecheck` - TypeScript type check (`tsc --noEmit -p tsconfig.json`)
- `npm run format` - Format code with prettier
- `npm run test` - Run tests

**Note:** Always use `npm run typecheck` instead of calling `tsc` directly. Use `npm run lint` and `npm run lint:fix` for linting.

# Code Conventions

- TypeScript is used throughout the project
- Features follow a consistent pattern with metadata files
- Component names use PascalCase
- Files are organized by feature or function
- Import paths should be relative to the src directory
