import {
  type HtmlParsedOutput,
  renderRichText,
} from "@lanekassen/portal-riktekst/web";

export interface Samtykkevalg {
  statistikk?: { samtykket: boolean } | null;
}

export interface TeksterDto {
  heading?: string | null;
  subHeading?: string | null;
  innhold?: HtmlParsedOutput | null;
  footer?: HtmlParsedOutput | null;
  godtarAlt?: string | null;
  godtarIkkeAlt?: string | null;
}

const COOKIE_NAME = "lksamtykke";

export class SamtykkeBanner extends HTMLElement {
  #monitorEndpoint: string | undefined;
  #initializationStarted = false;
  #saving = false;

  connectedCallback(): void {
    if (this.#initializationStarted) {
      return;
    }

    this.#initializationStarted = true;
    void this.#initialize().catch((error: unknown) => {
      console.error("Failed to initialize consent banner.", error);
    });
  }

  show(): void {
    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (dialog && !dialog.open) {
      dialog.show();
    }
  }

  hide(): void {
    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (dialog?.open) {
      dialog.close();
    }
  }

  async #save(samtykket: boolean, button: HTMLButtonElement): Promise<void> {
    if (this.#saving) {
      return;
    }

    if (!this.#monitorEndpoint) {
      throw new Error(
        "The consent banner requires a monitor-endepunkt attribute.",
      );
    }

    this.#saving = true;
    this.#setActionButtonBusy(button, true);

    const samtykkevalg: Samtykkevalg = { statistikk: { samtykket } };
    try {
      const response = await fetch(
        `${this.#monitorEndpoint}/OppdaterSamtykke`,
        {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(samtykkevalg),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Consent request failed with status ${response.status}.`,
        );
      }

      if (samtykket) {
        reloadMonitorSetup();
      } else {
        window.location.reload();
      }
      this.hide();
    } finally {
      this.#saving = false;
      this.#setActionButtonBusy(button, false);
    }
  }

  #setActionButtonBusy(button: HTMLButtonElement, busy: boolean): void {
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

  async #initialize(): Promise<void> {
    this.#monitorEndpoint = this.getAttribute("monitor-endepunkt") ?? undefined;
    const teksterEndpoint = this.getAttribute("tekster-endepunkt");

    if (!this.#monitorEndpoint || !teksterEndpoint) {
      throw new Error(
        "The consent banner requires monitor-endepunkt and tekster-endepunkt attributes.",
      );
    }

    const url = new URL(
      `${teksterEndpoint}/LKNO/SamtykkeBanner2`,
      window.location.origin,
    );
    url.searchParams.set("culture", document.documentElement.lang);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Consent texts request failed with status ${response.status}.`,
      );
    }

    const tekster = (await response.json()) as TeksterDto;
    this.#render(tekster);
    if (!hasCookie(COOKIE_NAME)) {
      this.show();
    }
  }

  #render(tekster: TeksterDto): void {
    this.innerHTML = `
      <style>
        samtykke-banner .ds-dialog {
          inset: auto auto var(--ds-size-4) var(--ds-size-4);
          margin: 0;
          color: var(--ds-color-text-default);
        }

        @media (max-width: 40rem) {
          samtykke-banner .ds-dialog {
            inset: auto 0 0;
          }
        }

        samtykke-banner .ds-dialog__block > * {
          margin-block: var(--ds-size-4);
        }

        samtykke-banner .ds-dialog__block > *:first-child {
          margin-block-start: 0;
        }

        samtykke-banner .ds-dialog__block > *:last-child {
          margin-block-end: 0;
        }

        samtykke-banner .actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ds-size-4);
          margin-block-start: var(--ds-size-6);
        }

        samtykke-banner .ds-spinner[hidden] {
          display: none;
        }
      </style>
      <dialog id="samtykke-banner" class="ds-dialog" closedby="none" aria-labelledby="consent-title">
        <div class="ds-dialog__block">
          <h2 id="consent-title" class="ds-heading" data-size="sm">
            <div data-size="xs">${escapeHtml(tekster.heading)}</div>
            ${escapeHtml(tekster.subHeading)}
          </h2>
          <div id="consent-content"></div>
          <div id="consent-footer"></div>
          <div class="actions">
            <button class="ds-button" data-consent-banner-action="accept" type="button">
              <svg class="ds-spinner" aria-hidden="true" role="img" viewBox='0 0 50 50' hidden>
                <circle class="ds-spinner__background" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                <circle class="ds-spinner__circle" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
              ${escapeHtml(tekster.godtarAlt)}
            </button>
            <button class="ds-button" data-consent-banner-action="reject" type="button">
              <svg class="ds-spinner" aria-hidden="true" role="img" viewBox='0 0 50 50' hidden>
                <circle class="ds-spinner__background" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                <circle class="ds-spinner__circle" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
              ${escapeHtml(tekster.godtarIkkeAlt)}
            </button>
          </div>
        </div>
      </dialog>
    `;

    if (tekster.innhold) {
      this.#renderRichText("consent-content", tekster.innhold);
    }
    if (tekster.footer) {
      this.#renderRichText("consent-footer", tekster.footer);
    }

    this.querySelector<HTMLButtonElement>(
      '[data-consent-banner-action="accept"]',
    )?.addEventListener("click", (event) => {
      void this.#save(true, event.currentTarget as HTMLButtonElement).catch(
        (error: unknown) => {
          console.error("Failed to save consent.", error);
        },
      );
    });
    this.querySelector<HTMLButtonElement>(
      '[data-consent-banner-action="reject"]',
    )?.addEventListener("click", (event) => {
      void this.#save(false, event.currentTarget as HTMLButtonElement).catch(
        (error: unknown) => {
          console.error("Failed to save consent.", error);
        },
      );
    });
  }

  #renderRichText(containerId: string, output: HtmlParsedOutput): void {
    this.querySelector(`#${containerId}`)?.replaceWith(renderRichText(output));
  }
}

function hasCookie(name: string): boolean {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${name}=`));
}

function reloadMonitorSetup(): void {
  const setupScript = Array.from(document.scripts).find(
    (script) => script.dataset.setup === "true",
  );
  if (!setupScript) {
    return;
  }

  const reloadedScript = setupScript.cloneNode(true) as HTMLScriptElement;
  const url = new URL(setupScript.src);
  url.searchParams.set("consentReload", Date.now().toString());
  reloadedScript.src = url.toString();
  setupScript.replaceWith(reloadedScript);
}

function escapeHtml(value?: string | null): string {
  return (value ?? "").replace(/[&<>"']/g, (character) => {
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

customElements.define("samtykke-banner", SamtykkeBanner);
