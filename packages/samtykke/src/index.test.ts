import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SamtykkeBanner } from "./index";

describe("SamtykkeBanner React wrapper", () => {
  it("renders the custom element and endpoint attributes during SSR", () => {
    const markup = renderToStaticMarkup(
      createElement(SamtykkeBanner, {
        config: {
          monitorEndepunkt: "/api/consent",
          teksterEndepunkt: "/api/consent/texts",
        },
        className: "site-consent",
      }),
    );

    expect(markup).toBe(
      '<samtykke-banner class="site-consent" monitor-endepunkt="/api/consent" tekster-endepunkt="/api/consent/texts"></samtykke-banner>',
    );
  });
});
