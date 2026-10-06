import type {
  Inaktivitetsstatus,
  InaktivitetsvarslingConfig,
  InaktivitetTekster,
} from "./types";
import type { InaktivitetDialog } from "./web";

const FALLBACK_INTERVAL_SECONDS = 300;
const REQUEST_TIMEOUT_SECONDS = 15;

export class InaktivitetController {
  #monitorAbortController = new AbortController();
  #statusRequest?: AbortController;
  #statusTimer?: number;
  #renewing = false;
  #nextCheckSeconds = FALLBACK_INTERVAL_SECONDS;
  #confirmInactivityOrExpiry = false;

  constructor(
    private config: InaktivitetsvarslingConfig,
    private dialog: InaktivitetDialog,
    private release: () => void,
  ) {}

  get #stopped(): boolean {
    return this.#monitorAbortController.signal.aborted;
  }

  start(): void {
    void this.#loadTexts();
    void this.#check();
  }

  stop(): void {
    if (this.#stopped) {
      return;
    }

    this.#monitorAbortController.abort();
    clearTimeout(this.#statusTimer);
    this.release();
  }

  async #request(
    url: string,
    options: {
      signal?: AbortSignal;
      headers?: HeadersInit;
      parseJson?: boolean;
    } = {},
  ): Promise<{ status: number; ok: boolean; body: unknown }> {
    const timeout = new AbortController();
    const requestTimeoutTimer = setTimeout(
      () => timeout.abort(new Error("Inactivity request timed out.")),
      REQUEST_TIMEOUT_SECONDS * 1000,
    );

    const signals = [this.#monitorAbortController.signal, timeout.signal];
    if (options.signal) {
      signals.push(options.signal);
    }
    const combined = AbortSignal.any(signals);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: combined,
        headers: options.headers,
      });

      const body: unknown =
        response.ok && options.parseJson !== false
          ? await response.json()
          : undefined;

      return {
        status: response.status,
        ok: response.ok,
        body,
      };
    } finally {
      clearTimeout(requestTimeoutTimer);
    }
  }

  async #loadTexts(): Promise<void> {
    const textsUrl = new URL(this.config.textsUrl, window.location.origin);
    textsUrl.searchParams.set("culture", document.documentElement.lang);

    try {
      const response = await this.#request(textsUrl.href);

      if (!response.ok) {
        throw new Error(
          `Inactivity texts request failed with status ${response.status}.`,
        );
      }

      const texts = response.body as InaktivitetTekster;

      if (this.#stopped) {
        return;
      }

      this.dialog.setTexts(texts);
    } catch (error) {
      if (!this.#stopped) {
        console.error("Failed to load inactivity texts.", error);
      }
    }
  }

  #schedule(seconds = FALLBACK_INTERVAL_SECONDS): void {
    clearTimeout(this.#statusTimer);
    if (!this.#stopped && !this.#renewing)
      this.#statusTimer = setTimeout(() => {
        void this.#check();
      }, seconds * 1000);
  }

  async #check(afterRenewal = false): Promise<void> {
    if (
      this.#stopped ||
      (this.#renewing && !afterRenewal) ||
      this.#statusRequest
    ) {
      return;
    }

    clearTimeout(this.#statusTimer);
    const request = new AbortController();
    this.#statusRequest = request;
    let next = FALLBACK_INTERVAL_SECONDS;

    try {
      const statusUrl = new URL(this.config.statusUrl, document.baseURI);
      statusUrl.searchParams.set(
        "bekreftInaktivEllerUtloper",
        String(this.#confirmInactivityOrExpiry),
      );
      const response = await this.#request(statusUrl.href, {
        signal: request.signal,
      });

      if (this.#stopped || this.#statusRequest !== request) {
        return;
      }

      if (response.status === 401) {
        this.#expire();
        return;
      }

      if (!response.ok)
        throw new Error(
          `Inactivity status request failed with status ${response.status}.`,
        );

      const status = response.body as Inaktivitetsstatus;
      this.#confirmInactivityOrExpiry = status.bekreft ?? false;
      next = status.tidTilNesteSjekkSekunder ?? FALLBACK_INTERVAL_SECONDS;

      if (!status.skalViseModal) {
        this.dialog.setMode("hidden");
      } else if (status.inaktivitet) {
        this.dialog.setMode("warning");
      } else {
        this.dialog.setMode("login");
      }
    } catch (error) {
      if (!this.#stopped && this.#statusRequest === request) {
        console.error("Failed to check inactivity status.", error);
      }
    } finally {
      if (this.#statusRequest === request) {
        this.#statusRequest = undefined;
        this.#nextCheckSeconds = next;
        this.#schedule(next);
      }
    }
  }

  async renew(): Promise<void> {
    if (this.#stopped || this.#renewing) {
      return;
    }

    this.#renewing = true;
    this.#statusRequest?.abort();
    this.#statusRequest = undefined;

    clearTimeout(this.#statusTimer);
    this.dialog.setBusy(true);

    try {
      const response = await this.#request(this.config.renewUrl, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        parseJson: false,
      });

      if (this.#stopped) {
        return;
      }

      if (response.status === 401) {
        this.#expire();
        return;
      }

      if (response.status !== 200) {
        throw new Error(
          `Session renewal request failed with status ${response.status}.`,
        );
      }

      await this.#check(true);
    } catch (error) {
      if (!this.#stopped) {
        console.error("Failed to renew session.", error);
        this.#nextCheckSeconds = FALLBACK_INTERVAL_SECONDS;
      }
    } finally {
      if (this.#renewing && !this.#stopped) {
        this.#renewing = false;
        this.dialog.setBusy(false);
        this.#schedule(this.#nextCheckSeconds);
      }
    }
  }

  login(): void {
    if (this.#stopped || this.#renewing) {
      return;
    }

    this.stop();

    try {
      window.location.assign(this.config.loginUrl);
    } catch (error) {
      console.error("Failed to navigate to login.", error);
    }
  }

  logout(): void {
    if (this.#stopped || this.#renewing) {
      return;
    }

    this.stop();

    try {
      window.location.assign(this.config.logoutUrl);
    } catch (error) {
      console.error("Failed to navigate to logout.", error);
    }
  }

  #expire(): void {
    this.stop();

    try {
      window.location.assign(this.config.expiredUrl);
    } catch (error) {
      console.error("Failed to navigate after session expiry.", error);
    }
  }
}
