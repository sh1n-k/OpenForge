import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "out/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ["**/*.ts", "**/*.svelte"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        CustomEvent: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        MouseEvent: "readonly",
        PopStateEvent: "readonly",
        process: "readonly",
        URL: "readonly",
        window: "readonly",
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      "svelte/require-each-key": "off",
    },
  },
]);

export default eslintConfig;
