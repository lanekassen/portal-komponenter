import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InaktivitetController } from "./controller";
import type { InaktivitetsvarslingConfig, InaktivitetTekster } from "./types";
import type { InaktivitetDialog } from "./web";

const config: InaktivitetsvarslingConfig = {
  statusUrl: "/status",
  textsUrl: "/texts",
  loginUrl: "/login",
  renewUrl: "/renew",
  logoutUrl: "/logout",
  expiredUrl: "/logged-out",
};
const response = (body: unknown) => new Response(JSON.stringify(body));
const isTextsRequest = (url: unknown) =>
  new URL(String(url), window.location.origin).pathname === config.textsUrl;
const isStatusRequest = (url: unknown) =>
  new URL(String(url), document.baseURI).pathname === config.statusUrl;
function waitForAbort(signal: AbortSignal | null | undefined): Promise<never> {
  if (!signal) throw new Error("Expected a request abort signal.");
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
  });
}
const status = (
  skalViseModal = false,
  inaktivitet = true,
  tidTilNesteSjekkSekunder = 300,
) => ({ skalViseModal, inaktivitet, tidTilNesteSjekkSekunder });
let controller: InaktivitetController | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window.location, "assign").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    response(isTextsRequest(url) ? {} : status(true)),
  );
});

afterEach(() => {
  controller?.stop();
  controller = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(nextConfig = config) {
  const dialog = {
    setTexts: vi.fn<InaktivitetDialog["setTexts"]>(),
    setMode: vi.fn<InaktivitetDialog["setMode"]>(),
    setBusy: vi.fn<InaktivitetDialog["setBusy"]>(),
  };
  const release = vi.fn();
  controller = new InaktivitetController(
    nextConfig,
    dialog as unknown as InaktivitetDialog,
    release,
  );
  controller.start();
  return { dialog, release };
}

describe("polling controller", () => {
  it("fetches localized texts once and passes the response to the dialog", async () => {
    const texts: InaktivitetTekster = {
      loggUtKnappTekst: "Log out",
      tittel: "Session ending",
      innholdsTekst: "Your session is ending.",
      utvidSesjonsTekst: "Stay signed in",
      fornySesjonsTekst: "Log in again",
      sesjonUtloperInnholdsTekst: "Sign in again to continue.",
      sesjonUtloperTittel: "Session ended",
      cultureName: "en-US",
    };
    vi.spyOn(document.documentElement, "lang", "get").mockReturnValue("en-US");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        response(isTextsRequest(url) ? texts : status()),
      );
    const { dialog } = setup({
      ...config,
      textsUrl: "/texts?existing=keep&culture=nb-NO",
    });
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/texts?existing=keep&culture=en-US", window.location.origin)
        .href,
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(
      fetchMock.mock.calls.filter(([url]) => isTextsRequest(url)),
    ).toHaveLength(1);
    expect(dialog.setTexts).toHaveBeenCalledExactlyOnceWith(texts);
  });

  it("carries confirmation forward, preserves query parameters, and retains it after a failed check", async () => {
    const confirmations = [true, false, undefined, true];
    let checks = 0;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        if (isTextsRequest(url)) return response({});
        const check = checks++;
        if (check === 4) return new Response(null, { status: 500 });
        return response({
          ...status(false, true, 1),
          bekreft: confirmations[check],
        });
      });
    setup({
      ...config,
      statusUrl: "/status?existing=keep&bekreftInaktivEllerUtloper=true",
    });
    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(300_000);
    const urls = fetchMock.mock.calls
      .filter(([url]) => isStatusRequest(url))
      .map(([url]) => new URL(String(url)));
    expect(
      urls.map((url) => url.searchParams.get("bekreftInaktivEllerUtloper")),
    ).toEqual(["false", "true", "false", "false", "true", "true"]);
    for (const url of urls) {
      expect(url.searchParams.get("existing")).toBe("keep");
      expect(
        url.searchParams.getAll("bekreftInaktivEllerUtloper"),
      ).toHaveLength(1);
    }
  });

  it("checks immediately and on schedule, and sends uncached GET requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        response(isTextsRequest(url) ? {} : status(true, true, 60)),
      );
    const { dialog } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(dialog.setMode).toHaveBeenCalledExactlyOnceWith("warning");
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/status?bekreftInaktivEllerUtloper=false", document.baseURI)
        .href,
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("uses the fallback polling interval when the server omits it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        response(
          isTextsRequest(url)
            ? {}
            : { skalViseModal: false, inaktivitet: true },
        ),
      );
    setup();
    await vi.advanceTimersByTimeAsync(299_999);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(2);
  });

  it.each(["status", "renew"])(
    "stops and redirects once on %s HTTP 401",
    async (endpoint) => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
        (endpoint === "status" ? isStatusRequest(url) : url === "/renew")
          ? new Response(null, { status: 401 })
          : response(isTextsRequest(url) ? {} : status(true)),
      );
      const { release } = setup();
      await vi.advanceTimersByTimeAsync(0);
      if (endpoint === "renew") void controller?.renew();
      await vi.advanceTimersByTimeAsync(600_000);
      expect(window.location.assign).toHaveBeenCalledOnce();
      expect(window.location.assign).toHaveBeenCalledWith(config.expiredUrl);
      expect(release).toHaveBeenCalledOnce();
      expect(release.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(window.location.assign).mock.invocationCallOrder[0],
      );
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("rejects non-200 renewal responses, clears busy state, and allows retries", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        url === "/renew"
          ? new Response(null, { status: 204 })
          : response(isTextsRequest(url) ? {} : status(true)),
      );
    const { dialog, release } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(dialog.setMode).toHaveBeenCalledWith("warning");
    dialog.setMode.mockClear();
    void controller?.renew();
    await vi.advanceTimersByTimeAsync(0);
    expect(dialog.setMode).not.toHaveBeenCalled();
    expect(dialog.setBusy.mock.calls).toEqual([[true], [false]]);
    expect(release).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to renew session.",
      expect.any(Error),
    );
    void controller?.renew();
    await vi.advanceTimersByTimeAsync(0);
    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/renew"),
    ).toHaveLength(2);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("clears busy state and resumes polling after renewal times out", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, options) =>
        url === "/renew"
          ? waitForAbort(options?.signal)
          : response(isTextsRequest(url) ? {} : status(true)),
      );
    const { dialog } = setup();
    await vi.advanceTimersByTimeAsync(0);
    dialog.setMode.mockClear();
    void controller?.renew();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(dialog.setBusy).toHaveBeenCalledExactlyOnceWith(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(dialog.setBusy.mock.calls).toEqual([[true], [false]]);
    expect(dialog.setMode).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to renew session.",
      expect.any(Error),
    );
    await vi.advanceTimersByTimeAsync(300_000);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(2);
  });

  it("aborts renewal on stop without errors or rechecking status", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, options) =>
        url === "/renew"
          ? waitForAbort(options?.signal)
          : response(isTextsRequest(url) ? {} : status(true)),
      );
    setup();
    await vi.advanceTimersByTimeAsync(0);
    void controller?.renew();
    const request = fetchMock.mock.calls.find(([url]) => url === "/renew");
    expect(request?.[1]?.signal?.aborted).toBe(false);
    controller?.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(request?.[1]?.signal?.aborted).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("continues polling but never retries a failed texts request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, options) => {
        if (isTextsRequest(url)) {
          return waitForAbort(options?.signal);
        }
        return response(status(true, true, 2));
      });
    const { dialog } = setup();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(
      fetchMock.mock.calls.filter(([url]) => isStatusRequest(url)),
    ).toHaveLength(2);
    expect(dialog.setTexts).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(12_999);
    expect(console.error).not.toHaveBeenCalled();
    expect(dialog.setTexts).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_001);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load inactivity texts.",
      expect.any(Error),
    );
    await vi.advanceTimersByTimeAsync(300_000);
    expect(
      fetchMock.mock.calls.filter(([url]) => isTextsRequest(url)),
    ).toHaveLength(1);
    expect(dialog.setTexts).not.toHaveBeenCalled();
  });

  it("bounds body parsing and retries a timed-out status request", async () => {
    let checks = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (isTextsRequest(url)) return response({});
      if (++checks !== 1) return response(status());
      const hangingBody = response({});
      vi.spyOn(hangingBody, "json").mockImplementation(() =>
        waitForAbort(options?.signal),
      );
      return hangingBody;
    });
    setup();
    await vi.advanceTimersByTimeAsync(315_000);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to check inactivity status.",
      expect.any(Error),
    );
    expect(checks).toBe(2);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("coalesces renewal attempts, ignores stale status, and applies the fresh status mode", async () => {
    const pending: Array<(value: Response) => void> = [];
    let checks = 0;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        if (isTextsRequest(url)) return response({});
        if (url === "/renew") return new Response(null, { status: 200 });
        if (++checks === 1) return response(status(true, true, 1));
        return new Promise<Response>((resolve) => pending.push(resolve));
      });
    const { dialog } = setup();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(dialog.setMode).toHaveBeenCalledExactlyOnceWith("warning");
    dialog.setMode.mockClear();
    expect(checks).toBe(2);
    void controller?.renew();
    void controller?.renew();
    await vi.advanceTimersByTimeAsync(0);
    expect(dialog.setBusy).toHaveBeenCalledExactlyOnceWith(true);
    expect(dialog.setMode).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/renew"),
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/renew",
      expect.objectContaining({
        cache: "no-store",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      }),
    );
    pending[0](new Response(null, { status: 401 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(dialog.setMode).not.toHaveBeenCalled();
    expect(dialog.setBusy).toHaveBeenCalledExactlyOnceWith(true);
    pending[1](response(status(false)));
    await vi.advanceTimersByTimeAsync(0);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(dialog.setMode).toHaveBeenCalledExactlyOnceWith("hidden");
    expect(dialog.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it.each(["logout", "login"] as const)(
    "stops before navigating once on %s",
    async (action) => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
        response(isTextsRequest(url) ? {} : status(true, action !== "login")),
      );
      const { dialog, release } = setup();
      const navigationError = new Error("Navigation failed.");
      vi.mocked(window.location.assign).mockImplementation(() => {
        expect(release).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
        throw navigationError;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(dialog.setMode).toHaveBeenCalledExactlyOnceWith(
        action === "login" ? "login" : "warning",
      );
      controller?.[action]();
      controller?.[action]();
      expect(window.location.assign).toHaveBeenCalledOnce();
      expect(window.location.assign).toHaveBeenCalledWith(
        action === "login" ? config.loginUrl : config.logoutUrl,
      );
      expect(console.error).toHaveBeenCalledWith(
        `Failed to navigate to ${action}.`,
        navigationError,
      );
    },
  );
});
