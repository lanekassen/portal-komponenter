# @lanekassen/portal-inaktivitet

Dialog som varsler brukeren om at sesjonen er i ferd med å utløpe. Serveren styrer når dialogen vises, og brukeren kan forlenge sesjonen, logge ut eller logge inn på nytt.

> [!NOTE]
> Applikasjonen må inkludere CSS og temavariabler fra Lånekassens designsystem for at komponenten skal vises korrekt. [Se design.lanekassen.no](https://design.lanekassen.no/).

React:

```tsx
import { InaktivitetDialog } from "@lanekassen/portal-inaktivitet";

<InaktivitetDialog
  config={{
    statusUrl: "/du/SjekkOmSesjonUtloper",
    renewUrl: "/du/UtvidSesjon",
    textsUrl: "/api/mt1534/CMSProxy/lkno/InaktivitetsModal",
    loginUrl: "/du/logger_inn",
    logoutUrl: "/du/logger_ut",
    expiredUrl: "/${locale}/innlogging?status=logget-ut&arsak=inaktivitet",
  }}
/>;
```

Native DOM:

Importer modulen `@lanekassen/portal-inaktivitet/web` og registrer HTML-elementet:

```html
<inaktivitet-dialog
  status-url="/du/SjekkOmSesjonUtloper"
  renew-url="/du/UtvidSesjon"
  texts-url="/api/mt1534/CMSProxy/lkno/InaktivitetsModal"
  login-url="/du/logger_inn"
  logout-url="/du/logger_ut"
  expired-url="/${locale}/innlogging?status=logget-ut&arsak=inaktivitet"
></inaktivitet-dialog>
```