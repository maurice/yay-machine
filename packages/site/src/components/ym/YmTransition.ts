import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ym-transition")
class YmTransition extends LitElement {
  static styles = css`
  :host {
    display: inline-block;
    margin: 0 !important;
    font-size: 0.8em;
    text-align: center;
    padding: 0 0.5em;
    min-width: 80px;
    line-height: 24px;
    /* border: 2px solid #666; */
    border-radius: 5px;
    background-color: #f9f9f9;
    box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
    position: absolute;
    transition: 200ms box-shadow;
    user-select: none;
    color: #666;
    z-index: 1;
  }
  `;

  @property({ type: String })
  from = "";

  @property({ type: String })
  to = "";

  @property({ type: String })
  label: string | undefined;

  render() {
    return html`
      <div>${this.label}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ym-transition": YmTransition;
  }
}
