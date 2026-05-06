import type { Decorator, Preview } from "@storybook/react-vite";
import { DxThemeProvider, type DxThemeMode } from "@situ/web-ui";
import "@situ/web-design-tokens/styles.css";
import "../../../src/global.css";

const withTheme: Decorator = (Story, context) => {
  const themeGlobal = context.globals.theme;
  const mode: DxThemeMode =
    themeGlobal === "light" || themeGlobal === "dark" || themeGlobal === "auto"
      ? themeGlobal
      : "auto";

  return (
    <DxThemeProvider mode={mode}>
      <Story />
    </DxThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Color theme",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "auto", title: "System" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
