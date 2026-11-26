import type { PreviewType } from "@internal/storybook-theme/preview";
import { preview } from "@internal/storybook-theme/preview";
import { definePreview } from "@storybook/react-vite";
import addonMsw from "msw-storybook-addon";

// @ts-expect-error how to merge configs?
const p: PreviewType = definePreview({
  ...preview.input,
  addons: [...preview.input.addons, addonMsw()],
});

export type { PreviewType };

export default p;
