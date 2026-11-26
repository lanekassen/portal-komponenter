import "@lanekassen/ds-css";
import "@lanekassen/ds-css/theme";
import "./preview.css";

import { Divider, List, Paragraph } from "@lanekassen/ds-react";
import { MDXProvider } from "@mdx-js/react";
import addonA11y, { type A11yTypes } from "@storybook/addon-a11y";
import addonDocs, { type DocsTypes } from "@storybook/addon-docs";
import {
  DocsContainer,
  type DocsContainerProps,
  Unstyled,
} from "@storybook/addon-docs/blocks";
import addonThemes, {
  type ThemesTypes,
  withThemeByDataAttribute,
} from "@storybook/addon-themes";
import {
  definePreview,
  type ReactPreview,
  type ReactRenderer,
  type ReactTypes,
} from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { HeadingSelfLink, StorybookLink } from "./docs/components";
import componentStyles from "./docs/components.module.css";
import { customStylesDecorator } from "./docs/decorator";
import { theme } from "./theme";

const defaultTheme = "light";

export type PreviewType<T = object> = ReactPreview<
  ReactTypes &
    A11yTypes &
    DocsTypes &
    ThemesTypes & {
      csf4: true;
    } & T
>;

export const preview: PreviewType = definePreview({
  addons: [addonA11y(), addonDocs(), addonThemes()],
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme,
      attributeName: "data-color-scheme",
    }),
    customStylesDecorator,
  ],
  parameters: {
    layout: "centered",

    options: {
      storySort: {
        method: "alphabetical",
      },
    },

    controls: {
      disableSaveFromUI: true,
      expanded: false,
    },

    actions: {
      disable: true,
    },

    backgrounds: {
      disable: true,
    },

    a11y: {
      test: "error",
    },

    docs: {
      theme,
      codePanel: true,
      container: (props: DocsContainerProps<ReactRenderer>) => {
        const container = useRef<HTMLDivElement>(null);

        useEffect(() => {
          const theme = getTheme();
          document.documentElement.setAttribute("data-color-scheme", theme);
          container.current
            ?.querySelectorAll(
              ".markdown-alert-caution, .markdown-alert-note, .markdown-alert-tip, .markdown-alert-important, .markdown-alert-warning",
            )
            .forEach((x) => {
              x.classList.add("ds-alert");
              if (x instanceof HTMLElement) {
                if (x.classList.contains("markdown-alert-caution"))
                  x.dataset.color = "danger";
                if (x.classList.contains("markdown-alert-tip"))
                  x.dataset.color = "success";
                if (x.classList.contains("markdown-alert-note"))
                  x.dataset.color = "info";
                if (x.classList.contains("markdown-alert-important"))
                  x.dataset.color = "primary";
                if (x.classList.contains("markdown-alert-warning"))
                  x.dataset.color = "warning";
              }
            });
        });
        return (
          <div ref={container}>
            <Unstyled>
              <MDXProvider
                components={{
                  h1: (props) => (
                    <HeadingSelfLink
                      {...props}
                      className={componentStyles.heading}
                      data-size="xl"
                    />
                  ),
                  h2: (props) => (
                    <HeadingSelfLink
                      {...props}
                      className={componentStyles.heading}
                      data-size="lg"
                    />
                  ),
                  h3: (props) => (
                    <HeadingSelfLink
                      {...props}
                      className={componentStyles.heading}
                      data-size="md"
                    />
                  ),
                  h4: (props) => (
                    <HeadingSelfLink
                      {...props}
                      className={componentStyles.heading}
                      data-size="sm"
                    />
                  ),
                  ol: (props) => (
                    <List.Ordered {...props} className={componentStyles.list} />
                  ),
                  ul: (props) => (
                    <List.Unordered
                      {...props}
                      className={componentStyles.list}
                    />
                  ),
                  p: (props) => (
                    <Paragraph asChild>
                      <p {...props} className={componentStyles.paragraph} />
                    </Paragraph>
                  ),
                  hr: (props) => (
                    <Divider {...props} className={componentStyles.hr} />
                  ),
                  blockquote: (props) => (
                    <blockquote
                      {...props}
                      className={componentStyles.ingress}
                    />
                  ),
                  a: (props) => (
                    <StorybookLink
                      {...props}
                      className={componentStyles.link}
                    />
                  ),
                }}
              >
                <DocsContainer {...props} />
              </MDXProvider>
            </Unstyled>
          </div>
        );
      },
    },
  },
});

function getTheme() {
  const top = window.top?.location || window.location;
  const url = new URL(top.href);
  const globals = new URLSearchParams(
    url.searchParams.get("globals")?.replace(/;/g, "&").replace(/:/g, "="),
  );
  const theme = globals.get("theme") || defaultTheme;
  return theme;
}
