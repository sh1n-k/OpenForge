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
        FormData: "readonly",
        getComputedStyle: "readonly",
        HashChangeEvent: "readonly",
        HTMLDivElement: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        KeyboardEvent: "readonly",
        localStorage: "readonly",
        matchMedia: "readonly",
        MouseEvent: "readonly",
        PopStateEvent: "readonly",
        process: "readonly",
        queueMicrotask: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
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
