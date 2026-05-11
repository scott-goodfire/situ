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
  async viteFinal(viteConfig) {
    const { vanillaExtractPlugin } = await import("@vanilla-extract/vite-plugin");
    viteConfig.plugins = [...(viteConfig.plugins ?? []), vanillaExtractPlugin()];
    viteConfig.resolve = {
      ...viteConfig.resolve,
      dedupe: [...(viteConfig.resolve?.dedupe ?? []), "react", "react-dom", "react/jsx-runtime"],
    };
    return viteConfig;
  },
};

export default config;
