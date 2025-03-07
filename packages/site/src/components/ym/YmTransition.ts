import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("ym-transition")
export class YmTransition extends LitElement {
  static styles = css`
    :host {
      --color: var(--medium-grey);
      display: inline-block;
      margin: 0 !important;
      position: absolute;
      z-index: 1;
      transform: perspective(1px) translateZ(0);
      will-change: transform;
      transition:
        100ms color,
        100ms border;
    }

    :host([interactive]) {
      --color: var(--light-grey);
    }

    :host(.next) {
      --color: var(--medium-grey);
    }

    :host([label]) {
      color: var(--color);
      border: 2px solid #eee;
      background-color: #f9f9f9;
      border-radius: 3px;
    }

    :host([label].next:not(.hovered)) {
      border: 2px solid var(--light-grey);
    }

    :host(.hovered) {
      cursor: pointer;
      border: 2px solid var(--light-blue);

      .label {
        color: var(--light-blue);
      }
    }

    .label {
      font-size: smaller;
      text-align: center;
      padding: 0.2em 0.5em;
      line-height: 18px;
      transition: 200ms box-shadow;
      user-select: none;
      white-space: pre-line;
    }
  `;

  @property({ type: String, reflect: true })
  from = "";

  @property({ type: String, reflect: true })
  to = "";

  @property({ type: String, reflect: true })
  label: string | undefined;

  @property({ type: Boolean, reflect: true })
  interactive = false;

  render() {
    return this.label
      ? // prettier-ignore
        html`<div class=${classMap({ label: true })}>${this.label}</div> `
      : nothing;
  }
}
