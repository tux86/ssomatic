import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // `no-undef` cannot see TypeScript's ambient declarations, so it flagged
      // every DOM/Node global (Buffer, AbortSignal, the NodeJS namespace) and was
      // being appeased with a hand-maintained allowlist that kept going stale.
      // `tsc --noEmit` already catches genuinely undefined identifiers.
      "no-undef": "off",
      // Dashboard clamps its cursor from an effect when the filtered list shrinks;
      // deriving it during render instead would lose the user's position.
      "react-hooks/set-state-in-effect": "off",
    },
    settings: {
      react: { version: "19.0" },
    },
  },
  {
    ignores: ["node_modules", "dist", "*.config.js", "*.config.ts", "**/*.generated.ts"],
  },
];
