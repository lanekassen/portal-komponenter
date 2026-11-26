import { main } from "@internal/storybook-theme/main";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  ...main,
  stories: ["../stories/*.stories.@(j|t)s[x?]"],
  addons: [...main.addons, "msw-storybook-addon"],
};

export default config;
