import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
};

export default config;
