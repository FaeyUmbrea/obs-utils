import prettier from "eslint-plugin-prettier";
import globals from "globals";
import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginSvelte from "eslint-plugin-svelte";

export default [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
  ...eslintPluginSvelte.configs["flat/recommended"],
  {
    ignores: [
      "node_modules",
      "dist/*",
      "coverage",
      "playwright-report",
      ".vite-cache",
      ".nyc_output",
      ".github",
      ".yarn",
      "test-results/*",
    ],
  },
  {
    files: ["**/*"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        $: true,
        Hooks: true,
        game: true,
        foundry: true,
        Actors: true,
        ui: true,
        CONFIG: true,
        canvas: true,
        FormApplication: true,
        FilePicker: true,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    files: ["tests/**/*", "playwright*"],
  },
];
