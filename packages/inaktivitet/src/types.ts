export interface Inaktivitetsstatus {
  skalViseModal: boolean;
  tidTilNesteSjekkSekunder?: number;
  inaktivitet: boolean;
  bekreft?: boolean;
}

export type DialogMode = "hidden" | "warning" | "login";

export interface InaktivitetTekster {
  loggUtKnappTekst: string;
  tittel: string;
  innholdsTekst: string;
  utvidSesjonsTekst: string;
  fornySesjonsTekst: string;
  sesjonUtloperInnholdsTekst: string;
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
