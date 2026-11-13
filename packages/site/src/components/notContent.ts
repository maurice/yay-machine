import * as stylex from "@stylexjs/stylex";

// `Parameters<typeof stylex.props>` resolves to `never` under TypeScript 7
type StyleArg = stylex.StyleXArray<
  | null
  | undefined
  | boolean
  | stylex.CompiledStyles
  | Readonly<[stylex.CompiledStyles, stylex.InlineStyles]>
>;

// stylex.props() replaces any `className`, so Starlight's `not-content`
// opt-out class has to be merged in manually
export const notContent = (...styles: readonly StyleArg[]) => {
  const { className, style } = stylex.props(...styles);
  return {
    className: className ? `not-content ${className}` : "not-content",
    style,
  };
};
