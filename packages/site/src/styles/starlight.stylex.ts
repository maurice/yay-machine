import * as stylex from "@stylexjs/stylex";

// Starlight's theme tokens (see src/styles/custom.css) as compile-time constants
export const colors = stylex.defineConsts({
  accent: "var(--sl-color-accent)",
  accentHigh: "var(--sl-color-accent-high)",
  accentLow: "var(--sl-color-accent-low)",
  black: "var(--sl-color-black)",
  gray1: "var(--sl-color-gray-1)",
  gray2: "var(--sl-color-gray-2)",
  gray3: "var(--sl-color-gray-3)",
  gray4: "var(--sl-color-gray-4)",
  gray5: "var(--sl-color-gray-5)",
  gray6: "var(--sl-color-gray-6)",
  gray7: "var(--sl-color-gray-7)",
  orangeHigh: "var(--sl-color-orange-high)",
  textAccent: "var(--sl-color-text-accent)",
  textInvert: "var(--sl-color-text-invert)",
  white: "var(--sl-color-white)",
});

export const textSizes = stylex.defineConsts({
  xs: "var(--sl-text-xs)",
  sm: "var(--sl-text-sm)",
  base: "var(--sl-text-base)",
});
