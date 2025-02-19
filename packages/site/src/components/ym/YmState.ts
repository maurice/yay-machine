import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("ym-state")
class YmState extends LitElement {
  static styles = css`
  :host {
    position: absolute;
    margin: 0 !important;
  }

  .state {
    --state-color: var(--dark-grey);
    border: 2px solid var(--state-color);
    border-radius: 5px;
    background-color: #f9f9f9;
    min-width: 150px;
    min-height: 100px;
    box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
    font-size: 0.8em;
    display: inline-block;
    transition: 200ms box-shadow;
    user-select: none;
    will-change: transform;
  }

  .state.interactive {
    --state-color: var(--medium-grey);
  }

  .state.current {
    --state-color: var(--medium-blue);
    box-shadow: 0px 0px 0px 1px rgb(143 214 255), 0px 0px 0px 3px rgb(220 242 255), 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
    }
    
  .name {
    color: var(--state-color);
    border-bottom: 2px solid var(--state-color);
    padding: 0 0.2em;
    text-align: center;
  }

  .current .name {
    font-weight: bold;
    /* background-color: rgb(238 249 255);
    border-radius-top-left: 5px; */
  }
    `;

  @property({ type: String })
  name = "";

  @state()
  interactive = false;

  @state()
  current = false;

  render() {
    return html`
      <div class=${classMap({ state: true, interactive: this.interactive, current: this.current })}>
        <div class="name">${this.name}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ym-state": YmState;
  }
}
