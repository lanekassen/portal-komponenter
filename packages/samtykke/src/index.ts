"use client";

import {
  createElement,
  type HTMLAttributes,
  type ReactElement,
  useEffect,
} from "react";

export interface SamtykkeBannerProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  config: {
    monitorEndepunkt: string;
    teksterEndepunkt: string;
  };
}

export function SamtykkeBanner({
  config: { monitorEndepunkt, teksterEndepunkt },
  ...hostAttributes
}: SamtykkeBannerProps): ReactElement {
  useEffect(() => {
    void import("./web");
  }, []);

  return createElement("samtykke-banner", {
    ...hostAttributes,
    "monitor-endepunkt": monitorEndepunkt,
    "tekster-endepunkt": teksterEndepunkt,
  });
}
