import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-mcp"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: false,
  },
  async viteFinal(config) {
    const { vanillaExtractPlugin } = await import("@vanilla-extract/vite-plugin");
    config.plugins = [...(config.plugins ?? []), vanillaExtractPlugin()];
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
