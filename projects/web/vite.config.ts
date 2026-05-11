import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceNodeModules = path.resolve(webRoot, "../../node_modules");

const APP_TARGET = process.env.SITU_APP_URL ?? "http://127.0.0.1:4317";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),
    vanillaExtractPlugin(),
  ],
  resolve: {
    alias: {
      react: path.join(workspaceNodeModules, "react"),
      "react-dom": path.join(workspaceNodeModules, "react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: APP_TARGET, changeOrigin: true },
    },
  },
});
