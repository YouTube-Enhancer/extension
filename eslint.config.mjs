import { fixupPluginRules } from "@eslint/compat";
import eslintJavascript from "@eslint/js";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginNoSecrets from "eslint-plugin-no-secrets";
import { configs as eslintPluginPerfectionist } from "eslint-plugin-perfectionist";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginTailwindCSS from "eslint-plugin-tailwindcss";
import globals from "globals";
import { dirname } from "path";
// eslint-disable-next-line import/no-unresolved
import typescriptEslint from "typescript-eslint";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default [
	{
		ignores: ["**/watch.js", "dist/**/*", "releases/**/*"]
	},
	eslintJavascript.configs.recommended,
	...typescriptEslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ["**/*.ts", "**/*.tsx"]
	})),
	...eslintPluginTailwindCSS.configs["flat/recommended"],
	eslintPluginImport.flatConfigs.recommended,
	eslintPluginImport.flatConfigs.typescript,
	eslintPluginImport.flatConfigs.react,
	eslintPluginPromise.configs["flat/recommended"],
	eslintPluginPrettier,
	eslintPluginPerfectionist["recommended-natural"],
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
				projectService: true,
				tsconfigRootDir: __dirname
			},
			sourceType: "module"
		},
		plugins: {
			"@typescript-eslint": typescriptEslint.plugin,
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
			"no-unused-vars": "off",
			"no-useless-escape": "off",
			"prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
			"prefer-destructuring": ["error", { array: true, object: true }, { enforceForRenamedProperties: true }],
			"prettier/prettier": ["error", { endOfLine: "auto", useTabs: true }],
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
