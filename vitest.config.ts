// vitest.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";
const r = (...args: string[]) => resolve(__dirname, ...args);

export default defineConfig({
  root: r("src"),
  esbuild: {
    tsconfigRaw: "{}",
  },
});
