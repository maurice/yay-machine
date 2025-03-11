import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AnimateStateController } from "./CurrentStateController";

@customElement("ym-state")
export class YmState extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      margin: 0 !important;
      --state-color: var(--dark-grey);
      --name-border-width: 2px;
    }

    :host([interactive]) {
      --state-color: var(--light-grey);
    }

    :host([next]) {
      --state-color: var(--dark-grey);
    }

    :host([current]) {
      --state-color: var(--medium-blue);
    }

    :host(.hovered) {
      --state-color: var(--light-blue);
      --transition: none;
      cursor: pointer;
    }

    :host(:not([data])) .name {
      --name-border-width: 0px;
    }

    :host(.animate) {
      --transition:
        200ms box-shadow, 300ms color ease-in, 300ms border-color ease-in;
    }

    .state {
      border: 2px solid var(--state-color);
      border-radius: 6px;
      background-color: #f9f9f9;
      /* min-width: 150px;
      min-height: 100px; */
      box-shadow: 0px 0px 10px 0px rgb(0, 0, 0, 0.3);
      font-size: 0.8em;
      display: inline-block;
      transition: var(--transition);
      user-select: none;
      will-change: transform;
      display: flex;
      flex-direction: column;
    }

    .state.current {
      box-shadow:
        0px 0px 0px 1px rgb(143 214 255),
        0px 0px 0px 3px rgb(220 242 255),
        0px 0px 10px 0px rgb(0, 0, 0, 0.3);
    }

    .name {
      color: var(--state-color);
      border-bottom-width: var(--name-border-width);
      border-color: var(--state-color);
      border-bottom-style: solid;
      padding: 0 1em;
      text-align: center;
      transition: var(--transition);
      white-space: nowrap;
    }

    .data {
      color: var(--state-color);
      padding: 0 0.2em;
      line-height: normal;
      white-space: pre;
    }

    .state.compact {
      min-width: 80px;
      min-height: fit-content;

      .name {
        border-bottom: none;
      }
      .data {
        display: none;
      }
    }
  `;

  @property({ type: String })
  name = "";

  @property({ type: Boolean })
  compact = false;

  @property({ type: Object, reflect: true })
  data: object | undefined = {};

  @property({ type: Boolean, reflect: true })
  current = false;

  @property({ type: Boolean, reflect: true })
  next = false;

  @property({ type: Boolean, reflect: true })
  interactive = false;

  constructor() {
    super();

    new AnimateStateController(this);
  }

  render() {
    const embeddedData = this.data
      ? html`${Object.entries(this.data).map(
          ([key, value]) =>
            // prettier-ignore
            html`<div><em>${key}</em>: ${JSON.stringify(value, undefined, "  ")}</div>`,
        )}`
      : "";
    return html`
      <div
        class=${classMap({
          state: true,
          interactive: this.interactive,
          current: this.current,
          compact: this.compact,
        })}
      >
        <div class="name">${this.name}</div>
        <div class="data">${embeddedData}</div>
      </div>
    `;
  }
}
