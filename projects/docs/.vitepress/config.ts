import { defineConfig } from "vitepress";

export default defineConfig({
  title: "situ",
  description: "Run autoresearch on your codebase with Claude Managed Agents",
  base: "/",
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["README.md"],
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }]],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Getting started", link: "/getting-started" },
      { text: "CLI", link: "/cli" },
      { text: "Examples", link: "/example-autoresearch-runpod/DOC" },
      { text: "GitHub", link: "https://github.com/scott-goodfire/situ" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Home", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "Architecture", link: "/architecture" },
        ],
      },
      {
        text: "Examples",
        items: [
          {
            text: "autoresearch on RunPod H100",
            link: "/example-autoresearch-runpod/DOC",
          },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "CLI", link: "/cli" }],
      },
    ],
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/scott-goodfire/situ" }],
    editLink: {
      pattern: "https://github.com/scott-goodfire/situ/edit/main/projects/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
