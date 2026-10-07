"use client";

import {
  createElement,
  type HTMLAttributes,
  type ReactElement,
  useEffect,
} from "react";
import type { InaktivitetsvarslingConfig } from "./types";

export type { InaktivitetsvarslingConfig } from "./types";

export interface InaktivitetDialogProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  config: InaktivitetsvarslingConfig;
}

export function InaktivitetDialog({
  config: { statusUrl, textsUrl, loginUrl, renewUrl, logoutUrl, expiredUrl },
  ...hostAttributes
}: InaktivitetDialogProps): ReactElement {
  useEffect(() => {
    void import("./web");
  }, []);

  return createElement("inaktivitet-dialog", {
    ...hostAttributes,
    "status-url": statusUrl,
    "texts-url": textsUrl,
    "login-url": loginUrl,
    "renew-url": renewUrl,
    "logout-url": logoutUrl,
    "expired-url": expiredUrl,
  });
}
