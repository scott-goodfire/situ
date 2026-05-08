import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../../src/features/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-mcp"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
  async viteFinal(config) {
    const { vanillaExtractPlugin } = await import("@vanilla-extract/vite-plugin");
    config.plugins = [...(config.plugins ?? []), vanillaExtractPlugin()];
    // Dedupe React so workspace packages (web, web-ui, web-app-ui) all share
    // a single instance — otherwise stories that import from the live web app
    // hit two-React-instances and hooks fail with "Cannot read properties of
    // null (reading 'useEffect')".
    config.resolve = {
      ...config.resolve,
      dedupe: [
        ...(config.resolve?.dedupe ?? []),
        "react",
        "react-dom",
        "react/jsx-runtime",
      ],
    };
    return config;
  },
};

export default config;
