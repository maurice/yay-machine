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
      will-change: transform;
      transform: perspective(1px) translateZ(0);
    }

    .label {
      color: var(--color);
      font-size: 0.8em;
      text-align: center;
      padding: 0.2em 0.5em;
      min-width: 80px;
      line-height: 18px;
      background-color: #f9f9f9;
      box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
      border: 2px solid var(--color);
      // border-radius: 5px;
      transition: 200ms box-shadow;
      user-select: none;
      white-space: pre-line;
    }

    .label.compact {
      box-shadow: none;
      border: none;
      background-color: #ffffffdd;
      padding: 0;
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
