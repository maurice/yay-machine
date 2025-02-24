import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

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
    padding: 0 0.5em;
    min-width: 80px;
    line-height: 24px;
    background-color: #f9f9f9;
    box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
    border: 2px solid var(--color);
    // border-radius: 5px;
    transition: 200ms box-shadow;
    user-select: none;
  }
  `;

  @property({ type: String })
  from = "";

  @property({ type: String })
  to = "";

  @property({ type: String })
  label: string | undefined;

  render() {
    return this.label
      ? html`
      <div class="label">${this.label}</div>
    `
      : nothing;
  }
}
