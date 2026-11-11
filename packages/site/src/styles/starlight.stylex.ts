import * as stylex from "@stylexjs/stylex";

// Starlight's theme tokens (see src/styles/custom.css) as compile-time constants
export const colors = stylex.defineConsts({
  gray1: "var(--sl-color-gray-1)",
  gray6: "var(--sl-color-gray-6)",
  textAccent: "var(--sl-color-text-accent)",
  textInvert: "var(--sl-color-text-invert)",
});
