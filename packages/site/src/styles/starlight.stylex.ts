import * as stylex from "@stylexjs/stylex";

// Starlight's theme tokens (see src/styles/custom.css) as compile-time constants
export const colors = stylex.defineConsts({
  black: "var(--sl-color-black)",
  gray1: "var(--sl-color-gray-1)",
  gray4: "var(--sl-color-gray-4)",
  gray5: "var(--sl-color-gray-5)",
  gray6: "var(--sl-color-gray-6)",
  gray7: "var(--sl-color-gray-7)",
  textAccent: "var(--sl-color-text-accent)",
  textInvert: "var(--sl-color-text-invert)",
});
