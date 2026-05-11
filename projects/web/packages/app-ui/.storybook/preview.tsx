import type { Decorator, Preview } from "@storybook/react-vite";
import { DxThemeProvider, type DxThemeMode } from "@situ/web-ui";
import "@situ/web-design-tokens/styles.css";
import "@situ/web-ui/foundation.css";

const withTheme: Decorator = (Story, context) => {
  const themeGlobal = context.globals.theme;
  const mode: DxThemeMode =
    themeGlobal === "light" || themeGlobal === "dark" || themeGlobal === "auto"
      ? themeGlobal
      : "auto";
  // Stories opt out of the default 24px padding by setting `parameters: { fullBleed: true }`.
  // Used by views that need to span the whole canvas (e.g. the research-map dashboard).
  const fullBleed = Boolean(context.parameters?.fullBleed);

  return (
    <DxThemeProvider mode={mode}>
      {fullBleed ? (
        <Story />
      ) : (
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      )}
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
