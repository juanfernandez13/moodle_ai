import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".next/**",
      "next-env.d.ts",
      "public/**",
      "docs/**",
      ".agents/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      "src/**/*.ts",
      "src/**/*.tsx",
      "app/**/*.ts",
      "app/**/*.tsx",
      "tests/**/*.ts",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
);
