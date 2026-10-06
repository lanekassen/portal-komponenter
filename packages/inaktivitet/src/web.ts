import { InaktivitetController } from "./controller";
import type {
  DialogMode,
  InaktivitetsModal,
  InaktivitetsvarslingConfig,
} from "./types";

export type { InaktivitetsvarslingConfig } from "./types";

interface MonitorConnection {
  config: InaktivitetsvarslingConfig;
  controller?: InaktivitetController;
}

let activeMonitor: MonitorConnection | undefined;

export class InaktivitetDialog extends HTMLElement {
  #connection?: MonitorConnection;
  #texts?: InaktivitetsModal;
  #mode: DialogMode = "hidden";
  #busy = false;

  connectedCallback(): void {
    if (this.#connection) {
      return;
    }

    void this.#initialize().catch((error: unknown) => {
      console.error("Failed to initialize inactivity dialog.", error);
    });
  }

  disconnectedCallback(): void {
    const connection = this.#connection;
    if (connection) {
      connection.controller?.stop();
      this.#release(connection);
    } else {
      this.hide();
    }
  }

  show(): void {
    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (
      !this.isConnected ||
      !dialog ||
      dialog.open ||
      this.#mode === "hidden"
    ) {
      return;
    }

    dialog.showModal();
  }

  hide(): void {
    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (!dialog?.open) {
      return;
    }

    dialog.close();
  }

  setTexts(texts: InaktivitetsModal): void {
    this.#render(texts);
    this.#texts = texts;
    this.show();
  }

  setMode(mode: DialogMode): void {
    if (mode !== this.#mode) {
      this.#mode = mode;
      if (mode !== "hidden" && this.#texts) {
        this.#render(this.#texts);
      }
    }

    if (mode === "hidden") {
      this.hide();
    } else {
      this.show();
    }
  }

  setBusy(busy: boolean): void {
    this.#busy = busy;
    for (const button of this.querySelectorAll<HTMLButtonElement>(
      "button[data-inaktivitet-dialog-action]",
    )) {
      if (busy) {
        button.setAttribute("aria-busy", "true");
      } else {
        button.removeAttribute("aria-busy");
      }

      const spinner = button.querySelector<SVGSVGElement>(".ds-spinner");
      if (busy) {
        spinner?.removeAttribute("hidden");
      } else {
        spinner?.setAttribute("hidden", "");
      }
    }
  }

  async #initialize(): Promise<void> {
    const statusUrl = this.getAttribute("status-url");
    const textsUrl = this.getAttribute("texts-url");
    const loginUrl = this.getAttribute("login-url");
    const renewUrl = this.getAttribute("renew-url");
    const logoutUrl = this.getAttribute("logout-url");
    const expiredUrl = this.getAttribute("expired-url");

    if (
      !statusUrl ||
      !textsUrl ||
      !loginUrl ||
      !renewUrl ||
      !logoutUrl ||
      !expiredUrl
    ) {
      throw new Error(
        "The inactivity dialog requires the following attributes: status-url, texts-url, login-url, renew-url, logout-url, expired-url.",
      );
    }

    const config: InaktivitetsvarslingConfig = {
      statusUrl,
      textsUrl,
      loginUrl,
      renewUrl,
      logoutUrl,
      expiredUrl,
    };

    if (activeMonitor) {
      throw new Error(
        "Inactivity monitoring is already running in this document.",
      );
    }

    const connection: MonitorConnection = { config };
    this.#connection = connection;
    activeMonitor = connection;

    try {
      connection.controller = new InaktivitetController(config, this, () =>
        this.#release(connection),
      );
      connection.controller.start();
    } catch (error) {
      if (this.#connection !== connection) {
        return;
      }
      connection.controller?.stop();
      this.#release(connection);
      throw error;
    }
  }

  #release(connection: MonitorConnection): void {
    if (this.#connection !== connection) {
      return;
    }
    this.#connection = undefined;
    activeMonitor = undefined;
    this.hide();
    this.#texts = undefined;
    this.#mode = "hidden";
    this.#busy = false;
    this.replaceChildren();
  }

  #render(tekster: InaktivitetsModal): void {
    const previousDialog = this.querySelector<HTMLDialogElement>("dialog");
    const wasOpen = previousDialog?.open;
    if (wasOpen) {
      previousDialog.close();
    }

    const isLoginMode = this.#mode === "login";

    this.innerHTML = `
      <style>
        inaktivitet-dialog .ds-dialog__block > * {
          margin-block: var(--ds-size-4);
        }

        inaktivitet-dialog .ds-dialog__block > *:first-child {
          margin-block-start: 0;
        }

        inaktivitet-dialog .ds-dialog__block > *:last-child {
          margin-block-end: 0;
        }

        inaktivitet-dialog .actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ds-size-4);
          margin-block-start: var(--ds-size-6);
        }

        inaktivitet-dialog .ds-spinner[hidden] {
          display: none;
        }
      </style>
      <dialog id="inaktivitet-dialog" class="ds-dialog" closedby="none" aria-labelledby="inaktivitet-title" aria-describedby="inaktivitet-content">
        <${isLoginMode ? "a" : "button"}
          class="ds-button"
          aria-label="${tekster.cultureName.toLowerCase() === "en-us" ? "Close" : "Lukk"}"
          data-color="neutral"
          data-icon="true"
          data-variant="tertiary"
          data-command="close"
          ${isLoginMode ? `href="${escapeHtml(this.#connection?.config.loginUrl ?? "")}"` : 'data-inaktivitet-dialog-action="renew" type="button"'}
        ></${isLoginMode ? "a" : "button"}>
        <div class="ds-dialog__block">
          <h2 id="inaktivitet-title" class="ds-heading" data-size="sm">${escapeHtml(isLoginMode ? tekster.sesjonUtloperTittel : tekster.tittel)}</h2>
          <div id="inaktivitet-content">${escapeHtml(isLoginMode ? tekster.sesjonUtloperInnholdsTekst : tekster.innholdsTekst)}</div>
          <div class="actions">
            ${
              isLoginMode
                ? `
                  <a autofocus class="ds-button" href="${escapeHtml(this.#connection?.config.loginUrl ?? "")}">
                    ${escapeHtml(tekster.fornySesjonsTekst)}
                  </a>
                `
                : `
                  <button autofocus class="ds-button" data-inaktivitet-dialog-action="renew" type="button">
                    <svg class="ds-spinner" aria-hidden="true" role="img" viewBox="0 0 50 50" hidden>
                      <circle class="ds-spinner__background" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                      <circle class="ds-spinner__circle" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                    </svg>
                    ${escapeHtml(tekster.utvidSesjonsTekst)}
                  </button>
                  <a class="ds-button" data-variant="secondary" href="${escapeHtml(this.#connection?.config.logoutUrl ?? "")}">
                    ${escapeHtml(tekster.loggUtKnappTekst)}
                  </a>
                `
            }
          </div>
        </div>
      </dialog>
    `;

    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    dialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
    });

    for (const button of this.querySelectorAll<HTMLButtonElement>(
      "button[data-inaktivitet-dialog-action]",
    )) {
      button.addEventListener("click", (event) => {
        if (this.#busy) {
          event.preventDefault();
          return;
        }

        void this.#connection?.controller?.renew();
      });
    }

    this.setBusy(this.#busy);
    if (wasOpen && dialog) {
      dialog.showModal();
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

customElements.define("inaktivitet-dialog", InaktivitetDialog);
