# @lanekassen/portal-inaktivitet

Dialog som varsler brukeren om at sesjonen er i ferd med å utløpe. Serveren styrer når dialogen vises, og brukeren kan forlenge sesjonen, logge ut eller logge inn på nytt.

> [!NOTE]
> Applikasjonen må inkludere CSS og temavariabler fra Lånekassens designsystem for at komponenten skal vises korrekt. [Se design.lanekassen.no](https://design.lanekassen.no/).

React:

```tsx
import { InaktivitetDialog } from "@lanekassen/portal-inaktivitet";

<InaktivitetDialog
  config={{
    statusUrl: "/api/session/status",
    textsUrl: "/api/texts/inactivity",
    loginUrl: "/login",
    renewUrl: "/api/session/renew",
    logoutUrl: "/logout",
    expiredUrl: "/logged-out",
  }}
/>;
```

Native DOM:

Importer modulen `@lanekassen/portal-inaktivitet/web` og registrer HTML-elementet:

```html
<inaktivitet-dialog
  status-url="/api/session/status"
  texts-url="/api/texts/inactivity"
  login-url="/login"
  renew-url="/api/session/renew"
  logout-url="/logout"
  expired-url="/logged-out"
></inaktivitet-dialog>
```