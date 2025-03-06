import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";

const tryItBadge = {
  text: "",
  variant: "tip",
  class: "ph-duotone ph-cursor",
  title: "Try the interactive demo",
};

// https://astro.build/config
export default defineConfig({
  site: "https://yay-machine.js.org/",
  integrations: [
    starlight({
      title: "yay-machine",
      customCss: [
        "./src/styles/custom.css",
        "../../node_modules/@phosphor-icons/web/src/regular/style.css",
        "../../node_modules/@phosphor-icons/web/src/bold/style.css",
        "../../node_modules/@phosphor-icons/web/src/duotone/style.css",
        "../../node_modules/@phosphor-icons/web/src/fill/style.css",
      ],
      social: {
        github: "https://github.com/maurice/yay-machine",
      },
      sidebar: [
        {
          label: "Intro",
          items: [
            { label: "Quick Start", slug: "quick-start", badge: tryItBadge },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Examples",
          items: [
            {
              label: "Toggle (on/off)",
              slug: "examples/toggle",
              badge: tryItBadge,
            },
            {
              label: "Counter (1, 2, 3 ...)",
              slug: "examples/counter",
              badge: tryItBadge,
            },
            {
              label: "Guess the number",
              slug: "examples/guess",
              badge: tryItBadge,
            },
            {
              label: "Login",
              slug: "examples/login",
            },
            {
              label: "Health (game component)",
              slug: "examples/health",
            },
            {
              label: "Tape (VCR)",
              slug: "examples/tape",
            },
            {
              label: "STOMP parser",
              slug: "examples/stomp-parser",
            },
            {
              label: "Stock tickers",
              slug: "examples/stock-tickers",
              badge: tryItBadge,
            },
            {
              label: "Elevator",
              slug: "examples/elevator",
            },
            {
              label: "Elevators controller",
              slug: "examples/elevators-controller",
            },
          ],
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
