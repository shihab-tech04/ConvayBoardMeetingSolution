import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import baseConfig from "./vite.config";

// Runs the router regression under the same base URL as the Pages build.
export default defineConfig(mergeConfig(baseConfig, {
  base: "/ConvayBoardMeetingSolution/",
}));
