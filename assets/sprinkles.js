import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: true });

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

function animateScrollTop(element, newPosition) {
  const position = element.scrollTop;
  const delta = newPosition - position;
  const duration = 500;
  const start = performance.now();

  function step(currentTime) {
    const progress = (currentTime - start) / duration;
    if (progress < 1) {
      const newScrollTop = position + easeInOutCubic(progress) * delta;
      element.scrollTop = newScrollTop;
      requestAnimationFrame(step);
    } else {
      element.scrollTop = newPosition;
    }
  }
  requestAnimationFrame(step);
}

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

    const jumpEls = document.querySelectorAll(".jump-to-section");
    for (const jumpEl of jumpEls) {
      jumpEl.addEventListener("click", (event) => {
        document.body.classList.remove("nav-open");
        document.body.scrollTop = bodyScrollTop;

        event.preventDefault();
        event.stopImmediatePropagation();
        const headerId = jumpEl.href.split("#").reverse().shift();
        const headerEl = document.querySelector(`#${headerId}`);
        const targetScrollTop = headerEl.offsetTop - 87;
        animateScrollTop(document.body, targetScrollTop);
        history.pushState({}, "", `#${headerId}`);
      });
    }

    const menuSelected = document.querySelector(".menu-selected");
    menuSelected.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      animateScrollTop(document.body, 0);
      const uri = window.location.toString();
      if (uri.indexOf("#") > 0) {
        const cleanUri = uri.substring(0, uri.indexOf("#"));
        window.history.replaceState({}, document.title, cleanUri);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initDeferred);
}
