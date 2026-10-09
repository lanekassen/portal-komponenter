import type { HtmlParsedOutput } from "@lanekassen/portal-riktekst/web";

export interface Inaktivitetsstatus {
  skalViseModal: boolean;
  tidTilNesteSjekkSekunder?: number;
  inaktivitet: boolean;
  bekreft?: boolean;
}

export type DialogMode = "hidden" | "warning" | "login";

export interface InaktivitetsModal {
  loggUtKnappTekst: string;
  tittel: string;
  innholdsTekst: HtmlParsedOutput;
  utvidSesjonsTekst: string;
  fornySesjonsTekst: string;
  sesjonUtloperInnholdsTekst: HtmlParsedOutput;
  sesjonUtloperTittel: string;
  cultureName: string;
}

export interface InaktivitetsvarslingConfig {
  statusUrl: string;
  textsUrl: string;
  loginUrl: string;
  renewUrl: string;
  logoutUrl: string;
  expiredUrl: string;
}
