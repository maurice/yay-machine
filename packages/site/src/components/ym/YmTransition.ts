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
    }

    :host([label]) {
      color: var(--color);
      border: 2px solid #eee;
      background-color: #f9f9f9;
      // border: 2px solid transparent;
      border-radius: 3px;
    }

    .label {
      // font-size: 0.8em;
      font-size: smaller;
      text-align: center;
      padding: 0.2em 0.5em;
      // min-width: 80px;
      line-height: 18px;
      // box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
      transition: 200ms box-shadow;
      user-select: none;
      white-space: pre-line;
    }
  `;

  @property({ type: String })
  from = "";

  @property({ type: String })
  to = "";

  @property({ type: String })
  label: string | undefined;

  @property({ type: Boolean })
  compact = false;

  render() {
    return this.label
      ? // prettier-ignore
        html`<div class=${classMap({ label: true, compact: this.compact })}>${this.label}</div> `
      : nothing;
  }
}
