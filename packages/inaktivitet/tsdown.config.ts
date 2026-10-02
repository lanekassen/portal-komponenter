import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/web.ts"],
  inputOptions: {
    onLog(level, log, defaultHandler) {
      // Silence warnings for "use client" directives which was introduced in rolldown v1.2.9
      // Adapted from https://github.com/vitejs/vite-plugin-react/blob/c90e60ace9cadafa9d056836cc2b9ffe68e1f21d/packages/common/warning.ts#L9
      if (
        log.code === "MODULE_LEVEL_DIRECTIVE" &&
        log.message.includes("use client")
      ) {
        return;
      }
      defaultHandler(level, log);
    },
  },
});
