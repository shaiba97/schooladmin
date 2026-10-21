import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // School convention: screens fetch on mount/param change with loading
  // flags set inside the effect (same pattern as the student/teacher apps,
  // whose older configs never flagged it). The react-hooks v6
  // set-state-in-effect rule conflicts with that convention, so it stays
  // off here; every fetch still guards against unmount via cancellation.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
