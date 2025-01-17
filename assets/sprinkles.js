import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: true });

export function initSprinkles(assetsPath) {
  const copyImg = `<img class="icon copy-icon" src="${assetsPath}/copy.svg"/>`;
  const copiedImg = `<img class="icon copied-icon" src="${assetsPath}/check.svg"/>`;

  function initDeferred() {
    const codeEls = document.querySelectorAll("pre code.hljs:not(.language-mermaid)");
    for (const codeEl of codeEls) {
      const pre = codeEl.parentElement;
      const button = document.createElement("button");
      button.innerHTML = copyImg;
      button.classList.add("copy-button");
      button.title = "Copy to clipboard";
      button.addEventListener("click", () => {
        try {
          navigator.clipboard.writeText(codeEl.textContent);
          button.innerHTML = copiedImg;

          const tooltip = document.createElement("div");
          tooltip.className = "tooltip";
          tooltip.innerHTML = '<div class="tooltip-body">Copied to clipboard!</div><div class="tooltip-arrow"></div>';
          pre.insertBefore(tooltip, button);
          setTimeout(() => {
            button.innerHTML = copyImg;
            pre.removeChild(tooltip);
          }, 1_000);
        } catch (e) {
          console.error("Couldn't write text to clipboard", e);
        }
      });
      pre.insertBefore(button, codeEl);
    }

    let bodyScrollTop = 0;
    const openNavButton = document.querySelector(".nav-button.open-nav");
    openNavButton.addEventListener("click", () => {
      bodyScrollTop = document.body.scrollTop;
      document.body.classList.add("nav-open");
    });

    const closeNavButton = document.querySelector(".nav-button.close-nav");
    closeNavButton.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      document.body.scrollTop = bodyScrollTop;
    });
  }

  document.addEventListener("DOMContentLoaded", initDeferred);
}
