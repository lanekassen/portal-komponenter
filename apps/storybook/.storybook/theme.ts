import { create, type ThemeVars } from "storybook/theming";

const appBackgroundColor = "var(--ds-color-accent-background-default)";
const accentColor = "#5b207e"; // doesn't support css vars
const textColor = "#383d42"; // doesn't support css vars
const backgroundColor = "var(--ds-color-neutral-background-default)";

export const theme: ThemeVars = create({
  base: "light",
  fontBase: '"Nunito Sans", sans-serif',

  brandTitle: "Lånekassen Designsystem",
  brandImage: "logo.svg",

  colorPrimary: accentColor,
  colorSecondary: accentColor,

  appBg: appBackgroundColor,
  appContentBg: backgroundColor,
  appPreviewBg: backgroundColor,
  appBorderRadius: 8,

  textColor: textColor,

  barTextColor: textColor,
  barSelectedColor: accentColor,
  barHoverColor: accentColor,
  barBg: backgroundColor,
});
