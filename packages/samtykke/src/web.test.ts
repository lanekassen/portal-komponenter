import { beforeEach, describe, expect, it, vi } from "vitest";
import "./web";
import type { SamtykkeBanner } from "./web";

function createBanner(): SamtykkeBanner {
  const banner = document.createElement("samtykke-banner") as SamtykkeBanner;
  banner.setAttribute("monitor-endepunkt", "/api/consent");
  banner.setAttribute("tekster-endepunkt", "/api/consent/texts");
  return banner;
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("SamtykkeBanner", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.querySelectorAll("script").forEach((script) => {
      script.remove();
    });
    // biome-ignore lint/suspicious/noDocumentCookie: resetting consent cookie for tests
    document.cookie = "lksamtykke=; Max-Age=0; Path=/";
    document.documentElement.lang = "nb-NO";
    vi.restoreAllMocks();
  });

  it("loads localized text and opens when consent has not been given", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({
        heading: "We use cookies",
        subHeading: "Your privacy matters.",
        innhold: {
          tagName: "P",
          children: [
            { text: "Cookies keep this site " },
            { tagName: "STRONG", text: "working" },
            { text: "." },
          ],
        },
        godtarAlt: "Accept all",
        godtarIkkeAlt: "Accept necessary",
      }),
    );
    document.documentElement.lang = "en-US";

    const banner = createBanner();
    document.body.append(banner);
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(true),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "/api/consent/texts/LKNO/SamtykkeBanner2?culture=en-US",
        window.location.origin,
      ),
    );
    expect(banner.querySelector('h2 [data-size="xs"]')?.textContent).toBe(
      "We use cookies",
    );
    expect(banner.querySelector("h2")?.textContent).toContain(
      "Your privacy matters.",
    );
    expect(
      Array.from(
        banner.querySelectorAll("p"),
        (paragraph) => paragraph.textContent,
      ),
    ).toContain("Cookies keep this site working.");
    expect(banner.querySelector("dialog strong")?.textContent).toBe("working");
    expect(
      banner.querySelector('[data-consent-banner-action="accept"]')
        ?.textContent,
    ).toContain("Accept all");
    expect(
      banner.querySelector('[data-consent-banner-action="reject"]')
        ?.textContent,
    ).toContain("Accept necessary");
  });

  it("renders scalar text as text instead of HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({
        heading: "<img src=x onerror=alert(1)>",
      }),
    );

    const banner = createBanner();
    document.body.append(banner);
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(true),
    );

    expect(banner.querySelector('h2 [data-size="xs"]')?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );
    expect(banner.querySelector("h2 img")).toBeNull();
  });

  it("logs an error and does not render when consent texts fail to load", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    const banner = createBanner();
    document.body.append(banner);
    await vi.waitFor(() => expect(errorMock).toHaveBeenCalledOnce());

    expect(errorMock).toHaveBeenCalledWith(
      "Failed to initialize consent banner.",
      expect.any(Error),
    );
    expect(banner.innerHTML).toBe("");
  });

  it("logs an error and does not render when required attributes are missing", async () => {
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const banner = document.createElement("samtykke-banner");
    document.body.append(banner);

    await vi.waitFor(() => expect(errorMock).toHaveBeenCalledOnce());

    expect(errorMock).toHaveBeenCalledWith(
      "Failed to initialize consent banner.",
      expect.any(Error),
    );
    expect(banner.innerHTML).toBe("");
  });

  it.each([
    { action: "accept", accepted: true, cookieExists: false },
    { action: "reject", accepted: false, cookieExists: false },
    { action: "accept", accepted: true, cookieExists: true },
    { action: "reject", accepted: false, cookieExists: true },
  ])("saves the $action choice", async ({ action, accepted, cookieExists }) => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const banner = createBanner();
    const setupScript = document.createElement("script");
    setupScript.src = "/monitor/setup.js";
    setupScript.dataset.setup = "true";
    setupScript.type = "application/json";
    document.head.append(setupScript);
    const reloadMock = vi
      .spyOn(window.location, "reload")
      .mockImplementation(() => {});
    if (cookieExists) {
      // biome-ignore lint/suspicious/noDocumentCookie: setting existing consent for tests
      document.cookie = "lksamtykke=existing; Path=/";
    }
    document.body.append(banner);
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")).not.toBeNull(),
    );
    banner.show();
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(true),
    );

    banner
      .querySelector<HTMLButtonElement>(
        `[data-consent-banner-action="${action}"]`,
      )
      ?.click();
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(false),
    );

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/consent/OppdaterSamtykke",
      {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statistikk: { samtykket: accepted } }),
      },
    );
    expect(banner.querySelector("dialog")?.open).toBe(false);
    if (accepted || !cookieExists) {
      const reloadedScript = document.head.querySelector<HTMLScriptElement>(
        'script[data-setup="true"]',
      );
      expect(reloadedScript).not.toBe(setupScript);
      expect(
        new URL(reloadedScript?.src ?? "", window.location.origin).pathname,
      ).toBe("/monitor/setup.js");
      expect(
        new URL(
          reloadedScript?.src ?? "",
          window.location.origin,
        ).searchParams.has("consentReload"),
      ).toBe(true);
      expect(reloadMock).not.toHaveBeenCalled();
    } else {
      expect(reloadMock).toHaveBeenCalledOnce();
      expect(
        document.head.querySelector<HTMLScriptElement>(
          'script[data-setup="true"]',
        ),
      ).toBe(setupScript);
    }
  });

  it("logs save errors and keeps the banner open", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const banner = createBanner();
    document.body.append(banner);
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(true),
    );

    banner
      .querySelector<HTMLButtonElement>('[data-consent-banner-action="accept"]')
      ?.click();
    await vi.waitFor(() => expect(errorMock).toHaveBeenCalledOnce());

    expect(errorMock).toHaveBeenCalledWith(
      "Failed to save consent.",
      expect.any(Error),
    );
    expect(banner.querySelector("dialog")?.open).toBe(true);
    expect(
      banner
        .querySelector<HTMLButtonElement>(
          '[data-consent-banner-action="accept"]',
        )
        ?.hasAttribute("aria-busy"),
    ).toBe(false);
  });

  it("does not add a monitor setup script when it is not already present", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const banner = createBanner();
    document.body.append(banner);
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(true),
    );

    banner
      .querySelector<HTMLButtonElement>('[data-consent-banner-action="accept"]')
      ?.click();
    await vi.waitFor(() =>
      expect(banner.querySelector("dialog")?.open).toBe(false),
    );

    expect(document.head.querySelector('script[data-setup="true"]')).toBeNull();
  });
});
