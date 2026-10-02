import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InaktivitetDialog } from "./index";

describe("InaktivitetDialog React wrapper", () => {
  it("renders the custom element and URL attributes during SSR", () => {
    const markup = renderToStaticMarkup(
      createElement(InaktivitetDialog, {
        config: {
          statusUrl: "/status",
          textsUrl: "/texts",
          loginUrl: "/login",
          renewUrl: "/renew",
          logoutUrl: "/logout",
          expiredUrl: "/logged-out",
        },
        className: "session-monitor",
      }),
    );

    expect(markup).toBe(
      '<inaktivitet-dialog class="session-monitor" status-url="/status" texts-url="/texts" login-url="/login" renew-url="/renew" logout-url="/logout" expired-url="/logged-out"></inaktivitet-dialog>',
    );
  });
});
