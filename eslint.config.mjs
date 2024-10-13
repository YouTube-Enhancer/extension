import eslintPluginReact from "eslint-plugin-react";
import eslintPluginNoSecrets from "eslint-plugin-no-secrets";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginTailwindCSS from "eslint-plugin-tailwindcss";
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintTypeScriptParser from "@typescript-eslint/parser";
import eslintJavascript from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
export default [
	{
		ignores: ["**/watch.js", "dist/**/*", "releases/**/*"]
	},
	eslintJavascript.configs.recommended,
	...typescriptEslint.configs.recommended,
	...eslintPluginTailwindCSS.configs["flat/recommended"],
	eslintPluginImport.flatConfigs.recommended,
	eslintPluginImport.flatConfigs.typescript,
	eslintPluginPromise.configs["flat/recommended"],
	eslintPluginPrettier,
	{
		plugins: {
			react: eslintPluginReact,
			"no-secrets": eslintPluginNoSecrets,
			perfectionist: eslintPluginPerfectionist,
			"react-hooks": fixupPluginRules(eslintPluginReactHooks)
		},
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
				chrome: "readonly"
			},
			parser: eslintTypeScriptParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				},
				project: "./tsconfig.json",
				tsconfigRootDir: "."
			}
		},
		settings: {
			tailwindcss: {
				callees: ["cn"],
				config: "./tailwind.config.ts"
			},
			react: {
				version: "detect"
			}
		},
		rules: {
			"react/react-in-jsx-scope": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
			semi: ["error", "always"],
			"prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
			"prefer-destructuring": ["error", { array: true, object: true }, { enforceForRenamedProperties: true }],
			"no-useless-escape": "off",
			"no-empty": ["error", { allowEmptyCatch: true }],
			"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"import/first": ["error"],
			"no-secrets/no-secrets": ["error", { tolerance: 5.0 }],
			"import/no-unresolved": "off",
			"tailwindcss/no-custom-classname": "off",
			"tailwindcss/classnames-order": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"import/no-named-as-default-member": "off"
		}
	},
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/.d.ts", "**/.spec.ts"],
		languageOptions: {
			parser: eslintTypeScriptParser
		}
	}
];
