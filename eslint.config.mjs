import { fixupPluginRules } from "@eslint/compat";
import eslintJavascript from "@eslint/js";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginNoSecrets from "eslint-plugin-no-secrets";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginTailwindCSS from "eslint-plugin-tailwindcss";
import globals from "globals";
// eslint-disable-next-line import/no-unresolved
import typescriptEslint from "typescript-eslint";

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
	eslintPluginPerfectionist.configs["recommended-natural"],
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			ecmaVersion: "latest",
			globals: {
				...globals.browser,
				...globals.node,
				chrome: "readonly"
			},
			parser: typescriptEslint.parser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				},
				project: "./tsconfig.json",
				tsconfigRootDir: "."
			},
			sourceType: "module"
		},
		plugins: {
			"no-secrets": eslintPluginNoSecrets,
			react: eslintPluginReact,
			"react-hooks": fixupPluginRules(eslintPluginReactHooks)
		},
		rules: {
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					ignoreRestSiblings: true,
					varsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/restrict-template-expressions": "off",
			"import/first": ["error"],
			"import/no-named-as-default-member": "off",
			"import/no-unresolved": "off",
			"no-empty": ["error", { allowEmptyCatch: true }],
			"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"no-secrets/no-secrets": ["error", { tolerance: 5.0 }],
			"no-useless-escape": "off",
			"prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
			"prefer-destructuring": ["error", { array: true, object: true }, { enforceForRenamedProperties: true }],
			quotes: ["error", "double", { allowTemplateLiterals: true, avoidEscape: true }],
			"react/react-in-jsx-scope": "off",
			semi: ["error", "always"],
			"tailwindcss/classnames-order": "error",
			"tailwindcss/no-custom-classname": "off"
		},
		settings: {
			react: {
				version: "detect"
			},
			tailwindcss: {
				callees: ["cn"],
				config: "./tailwind.config.ts"
			}
		}
	},
	{
		files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
		languageOptions: {
			ecmaVersion: "latest",
			globals: {
				...globals.node
			},
			sourceType: "module"
		}
	}
];
