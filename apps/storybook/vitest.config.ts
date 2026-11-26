import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    env: {
      TZ: "UTC", // To avoid flaky tests due to timezone differences in different environments
    },
    outputFile: {
      junit: "./test-report.xml",
    },
    reporters: [
      "default",
      "github-actions",
      ["junit", { addFileAttribute: true }],
    ],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["lcovonly", "cobertura"],
      reportOnFailure: true,
      allowExternal: true,
      include: ["**/*.?(c|m)[jt]s?(x)"],
      exclude: ["apps/**", "**/*.json"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "../../packages/*/!(node_modules)/**/*.{test,spec}.?(c|m)[jt]s",
          ],
          browser: {
            enabled: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          // React files are "e2e".
          include: [
            "../../packages/*/!(node_modules)/**/*.{test,spec}.?(c|m)[jt]sx",
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
