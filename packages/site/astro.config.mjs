import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "yay-machine",
      customCss: ["./src/styles/custom.css"],
      social: {
        github: "https://github.com/maurice/yay-machine",
      },
      sidebar: [
        {
          label: "Intro",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Quick Start", slug: "quick-start" },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Examples",
          autogenerate: { directory: "examples" },
        },
        {
          label: "Articles",
          autogenerate: { directory: "articles" },
        },
        {
          label: "Experiments",
          badge: { text: "WIP", variant: "danger" },
          collapsed: true,
          autogenerate: { directory: "experiments" },
        },
      ],
      logo: {
        src: "./src/assets/logo.png",
        replacesTitle: true,
      },
    }),
  ],
  vite: {
    define: {
      "process.env": JSON.stringify({}),
    },
  },
});
