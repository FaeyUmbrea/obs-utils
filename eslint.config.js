import prettier from "eslint-plugin-prettier";
import globals from "globals";
import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
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