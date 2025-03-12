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
      favicon: "./src/assets/doggie-head.svg",
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
      editLink: {
        baseUrl:
          "https://github.com/maurice/yay-machine/edit/main/packages/site/",
      },
      lastUpdated: true,
      sidebar: [
        {
          label: "Intro",
          items: [
            { label: "Quick Start", link: "quick-start/", badge: tryItBadge },
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
              link: "examples/toggle/",
              badge: tryItBadge,
            },
            {
              label: "Counter (1, 2, 3 ...)",
              link: "examples/counter/",
              badge: tryItBadge,
            },
            {
              label: "Guess the number",
              link: "examples/guess/",
              badge: tryItBadge,
            },
            {
              label: "Login",
              link: "examples/login/",
            },
            {
              label: "Health (game component)",
              link: "examples/health/",
            },
            {
              label: "Tape (VCR)",
              link: "examples/tape/",
            },
            {
              label: "STOMP parser",
              link: "examples/stomp-parser/",
            },
            {
              label: "Stock tickers",
              link: "examples/stock-tickers/",
              badge: tryItBadge,
            },
            {
              label: "Elevator",
              link: "examples/elevator/",
            },
            {
              label: "Elevators controller",
              link: "examples/elevators-controller/",
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
