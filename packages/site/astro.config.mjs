import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://yay-machine.js.org/",
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
      plugins: [starlightLinksValidator()],
    }),
    react(),
  ],
  vite: {
    define: {
      "process.env": JSON.stringify({}),
    },
  },
});
