import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InaktivitetController } from "./controller";
import type { InaktivitetsModal } from "./types";
import type { InaktivitetsvarslingConfig } from "./web";
import { InaktivitetDialog } from "./web";

class PresentationTestDialog extends InaktivitetDialog {
  connectedCallback(): void {}
}

customElements.define("presentation-test-dialog", PresentationTestDialog);

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const texts = {
  loggUtKnappTekst: "Log out",
  tittel: "Session ending",
  innholdsTekst: { tagName: "p", text: "Your session is ending." },
  utvidSesjonsTekst: "Stay signed in",
  fornySesjonsTekst: "Log in again",
  sesjonUtloperInnholdsTekst: {
    tagName: "p",
    text: "Sign in again to continue.",
  },
  sesjonUtloperTittel: "Session ended",
  cultureName: "en-US",
} satisfies InaktivitetsModal;

function setup() {
  const dialog = new PresentationTestDialog();
  document.body.append(dialog);
  dialog.setTexts(texts);
  return dialog;
}

describe("InaktivitetDialog", () => {
  it.each([
    ["EN-US", "Close"],
    ["nb-NO", "Lukk"],
  ])("labels the close button for %s", (cultureName, label) => {
    const dialog = setup();
    dialog.setTexts({ ...texts, cultureName });
    expect(
      dialog
        .querySelector('[data-command="close"]')
        ?.getAttribute("aria-label"),
    ).toBe(label);
  });

  it.each(["hidden", "warning", "login"] as const)(
    "applies %s visibility when texts arrive after the mode",
    (mode) => {
      const dialog = new PresentationTestDialog();
      document.body.append(dialog);
      dialog.setMode(mode);
      expect(dialog.querySelector("dialog")).toBeNull();
      dialog.setTexts(texts);
      expect(dialog.querySelector("dialog")?.open).toBe(mode !== "hidden");
    },
  );

  it("prevents dismissal and closes when hidden", () => {
    const dialog = setup();
    dialog.setMode("warning");
    expect(dialog.querySelector("dialog")?.open).toBe(true);
    const cancel = new Event("cancel", { cancelable: true });
    dialog.querySelector("dialog")?.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    dialog.setMode("hidden");
    expect(dialog.querySelector("dialog")?.open).toBe(false);
  });

  it.each(["warning", "login"] as const)(
    "opens a labelled modal and safely renders rich text in %s mode",
    (mode) => {
      const dialog = setup();
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const text = `<img src=x> &amp; "quoted" 'text'`;
      const content = {
        tagName: "p",
        attributes: { onclick: "alert(1)" },
        children: [
          { tagName: "strong", text },
          { tagName: "script", text: "alert(1)" },
        ],
      };
      dialog.setTexts({
        loggUtKnappTekst: text,
        tittel: text,
        innholdsTekst: content,
        utvidSesjonsTekst: text,
        fornySesjonsTekst: text,
        sesjonUtloperInnholdsTekst: content,
        sesjonUtloperTittel: text,
        cultureName: texts.cultureName,
      });
      dialog.setMode(mode);
      expect(showModal).toHaveBeenCalledOnce();
      const modal = dialog.querySelector("dialog");
      expect(modal?.getAttribute("aria-labelledby")).toBe(
        dialog.querySelector("h2")?.id,
      );
      expect(modal?.hasAttribute("aria-describedby")).toBe(false);
      expect(dialog.querySelector("img")).toBeNull();
      expect(dialog.querySelector("script")).toBeNull();
      expect(
        dialog.querySelector(".ds-dialog__block > p.ds-paragraph"),
      ).not.toBeNull();
      expect(
        dialog.querySelector(".ds-dialog__block > p strong")?.textContent,
      ).toBe(text);
      expect(
        dialog.querySelector(".ds-dialog__block > p")?.hasAttribute("onclick"),
      ).toBe(false);
      for (const element of dialog.querySelectorAll(
        "h2, .ds-dialog__block > p, .actions > *",
      )) {
        expect(element.textContent?.trim()).toBe(text);
      }
    },
  );

  it("replaces warning actions with only login and hides when instructed", () => {
    const dialog = setup();
    dialog.setMode("warning");
    dialog.setMode("login");
    expect(dialog.querySelector("dialog")?.open).toBe(true);
    expect(dialog.querySelector("h2")?.textContent).toBe("Session ended");
    expect(dialog.querySelector(".ds-dialog__block > p")?.textContent).toBe(
      "Sign in again to continue.",
    );
    expect(dialog.querySelectorAll(".actions a")).toHaveLength(1);
    expect(
      dialog
        .querySelector(".actions a")
        ?.hasAttribute("data-inaktivitet-dialog-action"),
    ).toBe(false);
    expect(dialog.querySelector(".actions a")?.textContent?.trim()).toBe(
      "Log in again",
    );
    const modal = dialog.querySelector("dialog");
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    dialog.setMode("hidden");
    expect(dialog.querySelector("dialog")).toBe(modal);
    expect(dialog.querySelector("dialog")?.open).toBe(false);
    expect(showModal).not.toHaveBeenCalled();
    dialog.setMode("warning");
    expect(dialog.querySelector("dialog")?.open).toBe(true);
    expect(dialog.querySelector("h2")?.textContent).toBe("Session ending");
    expect(dialog.querySelectorAll(".actions > *")).toHaveLength(2);
  });

  it("shows only the renewal spinner and preserves busy state across mode changes", () => {
    const dialog = setup();
    dialog.setMode("warning");
    const spinner = dialog.querySelector(".ds-spinner");
    expect(dialog.querySelectorAll(".ds-spinner")).toHaveLength(1);
    expect(spinner?.parentElement?.dataset.inaktivitetDialogAction).toBe(
      "renew",
    );
    expect(spinner?.hasAttribute("hidden")).toBe(true);
    expect(spinner?.getAttribute("aria-hidden")).toBe("true");

    dialog.setBusy(true);
    expect(spinner?.hasAttribute("hidden")).toBe(false);
    dialog.setMode("login");
    expect(dialog.querySelector(".ds-spinner")).toBeNull();
    for (const link of dialog.querySelectorAll("a")) {
      expect(link.hasAttribute("aria-busy")).toBe(false);
    }
    dialog.setMode("warning");
    expect(dialog.querySelector(".ds-spinner")?.hasAttribute("hidden")).toBe(
      false,
    );
    for (const button of dialog.querySelectorAll("button, a")) {
      expect(button.hasAttribute("aria-busy")).toBe(
        button.matches("button[data-inaktivitet-dialog-action]"),
      );
    }

    dialog.setBusy(false);
    expect(dialog.querySelector(".ds-spinner")?.hasAttribute("hidden")).toBe(
      true,
    );
    for (const button of dialog.querySelectorAll("button, a")) {
      expect(button.hasAttribute("aria-busy")).toBe(false);
    }
  });
});

describe("element-owned monitoring", () => {
  const config: InaktivitetsvarslingConfig = {
    statusUrl: "/status",
    textsUrl: "/texts",
    loginUrl: "/login",
    renewUrl: "/renew",
    logoutUrl: "/logout",
    expiredUrl: "/logged-out",
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes("texts")
              ? texts
              : {
                  skalViseModal: true,
                  inaktivitet: true,
                  tidTilNesteSjekkSekunder: 300,
                },
          ),
        ),
    );
  });

  function createDialog(nextConfig = config): InaktivitetDialog {
    const dialog = document.createElement(
      "inaktivitet-dialog",
    ) as InaktivitetDialog;
    for (const [key, value] of Object.entries(nextConfig)) {
      dialog.setAttribute(key.replace(/Url$/, "-url"), value);
    }
    return dialog;
  }

  it("blocks busy renewal buttons while keeping navigation links usable", async () => {
    const renew = vi
      .spyOn(InaktivitetController.prototype, "renew")
      .mockResolvedValue(undefined);
    const dialog = createDialog({
      ...config,
      loginUrl: '/login?returnTo="home"&culture=en',
      logoutUrl: "/logout?returnTo=home&culture=en",
    });
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    const focusedButton =
      dialog.querySelector<HTMLButtonElement>(".actions button");
    focusedButton?.click();
    expect(renew).toHaveBeenCalledOnce();
    focusedButton?.focus();
    dialog.setBusy(true);
    expect(document.activeElement).toBe(focusedButton);
    for (const button of dialog.querySelectorAll<HTMLElement>("button, a")) {
      expect(button.hasAttribute("aria-busy")).toBe(
        button.matches("button[data-inaktivitet-dialog-action]"),
      );
      const click = new MouseEvent("click", { cancelable: true });
      button.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(button instanceof HTMLButtonElement);
    }
    expect(renew).toHaveBeenCalledOnce();
    dialog.setBusy(false);
    expect(document.activeElement).toBe(focusedButton);
    focusedButton?.click();
    expect(renew).toHaveBeenCalledTimes(2);
    dialog.querySelector<HTMLButtonElement>('[data-command="close"]')?.click();
    expect(renew).toHaveBeenCalledTimes(3);
    const logoutLink = dialog.querySelector<HTMLAnchorElement>(".actions a");
    expect(logoutLink?.getAttribute("href")).toBe(
      "/logout?returnTo=home&culture=en",
    );
    const logoutClick = new MouseEvent("click", { cancelable: true });
    logoutLink?.dispatchEvent(logoutClick);
    expect(logoutClick.defaultPrevented).toBe(false);
    dialog.setMode("login");
    const loginLink = dialog.querySelector<HTMLAnchorElement>(".actions a");
    expect(loginLink?.getAttribute("href")).toBe(
      '/login?returnTo="home"&culture=en',
    );
    const loginClick = new MouseEvent("click", { cancelable: true });
    loginLink?.dispatchEvent(loginClick);
    expect(loginClick.defaultPrevented).toBe(false);
    const closeButton = dialog.querySelector<HTMLButtonElement>(
      'button[data-command="close"]',
    );
    const closeClick = new MouseEvent("click", { cancelable: true });
    closeButton?.dispatchEvent(closeClick);
    expect(closeClick.defaultPrevented).toBe(false);
    expect(renew).toHaveBeenCalledTimes(4);
    dialog.setBusy(true);
    const busyCloseClick = new MouseEvent("click", { cancelable: true });
    closeButton?.dispatchEvent(busyCloseClick);
    expect(busyCloseClick.defaultPrevented).toBe(true);
    expect(renew).toHaveBeenCalledTimes(4);
    dialog.remove();
    focusedButton?.click();
    expect(renew).toHaveBeenCalledTimes(4);
  });

  it("starts on connection, aborts on immediate removal, and restarts on reconnection", async () => {
    const dialog = createDialog();
    await vi.dynamicImportSettled();
    expect(fetch).not.toHaveBeenCalled();
    document.body.append(dialog);
    expect(fetch).toHaveBeenCalledOnce();
    const signals = vi
      .mocked(fetch)
      .mock.calls.map(([, options]) => options?.signal);
    dialog.remove();
    await vi.dynamicImportSettled();
    for (const signal of signals) {
      expect(signal?.aborted).toBe(true);
    }
    expect(dialog.querySelector("dialog")).toBeNull();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(dialog.querySelector("dialog")?.open).toBe(true);
  });

  it("allows only one active monitor and releases ownership on removal", async () => {
    const first = createDialog();
    const second = createDialog();
    document.body.append(first, second);
    expect(fetch).toHaveBeenCalledOnce();
    first.remove();
    second.remove();
    document.body.append(second);
    await vi.dynamicImportSettled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to initialize inactivity dialog.",
      expect.objectContaining({
        message: expect.stringContaining("already running"),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(second.querySelector("dialog")?.open).toBe(true);
    first.disconnectedCallback();
    const third = createDialog();
    document.body.append(third);
    await vi.dynamicImportSettled();
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(second.querySelector("dialog")?.open).toBe(true);
  });

  it("releases ownership after initialization fails and retries on reconnection", async () => {
    const failure = new Error("Controller startup failed.");
    vi.spyOn(InaktivitetController.prototype, "start").mockImplementationOnce(
      () => {
        throw failure;
      },
    );
    const dialog = createDialog();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to initialize inactivity dialog.",
      failure,
    );
    expect(dialog.isConnected).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    dialog.remove();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(dialog.querySelector("dialog")?.open).toBe(true);
  });

  it("reads new URLs only on reconnection and resets stale dialog state", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes("texts")
              ? texts
              : { skalViseModal: true, inaktivitet: true, bekreft: true },
          ),
        ),
    );
    const dialog = createDialog();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    dialog.setBusy(true);
    dialog.setAttribute("status-url", "/updated-status");
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toBe(
      new URL("/status?bekreftInaktivEllerUtloper=true", document.baseURI).href,
    );
    dialog.remove();
    expect(dialog.querySelector("dialog")).toBeNull();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch).toHaveBeenCalledWith(
      new URL(
        "/updated-status?bekreftInaktivEllerUtloper=false",
        document.baseURI,
      ).href,
      expect.anything(),
    );
    expect(dialog.querySelector("button")?.hasAttribute("aria-busy")).toBe(
      false,
    );
  });

  it("continues polling with a closed dialog and aborts requests on removal", async () => {
    vi.useFakeTimers();
    try {
      const dialog = createDialog();
      document.body.append(dialog);
      await vi.dynamicImportSettled();
      const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal;
      dialog.setMode("hidden");
      expect(dialog.querySelector("dialog")?.open).toBe(false);
      await vi.advanceTimersByTimeAsync(300_000);
      expect(fetch).toHaveBeenCalledTimes(3);
      dialog.remove();
      expect(signal?.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(300_000);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      document.body.replaceChildren();
      vi.useRealTimers();
    }
  });

  it("keeps the host mounted after expiry and releases monitoring ownership", async () => {
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    const dialog = createDialog();
    document.body.append(dialog);
    await vi.dynamicImportSettled();
    expect(window.location.assign).toHaveBeenCalledWith(config.expiredUrl);
    expect(dialog.isConnected).toBe(true);
    expect(dialog.querySelector("dialog")).toBeNull();
    document.body.append(createDialog());
    await vi.dynamicImportSettled();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalledWith(
      "Failed to initialize inactivity dialog.",
      expect.anything(),
    );
  });

  it("requires nonempty URL attributes without claiming ownership on failure", async () => {
    const missing = createDialog();
    missing.removeAttribute("status-url");
    document.body.append(missing, createDialog({ ...config, loginUrl: "" }));
    await vi.dynamicImportSettled();
    expect(fetch).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to initialize inactivity dialog.",
      expect.objectContaining({
        message:
          "The inactivity dialog requires the following attributes: status-url, texts-url, login-url, renew-url, logout-url, expired-url.",
      }),
    );
    document.body.append(createDialog());
    await vi.dynamicImportSettled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
