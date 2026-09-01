# @lanekassen/portal-samtykke

Samtykkebanner for informasjonskapsler. Brukes til å innhente samtykke fra brukeren.

> [!NOTE]
> Applikasjonen må inkludere CSS og temavariabler fra Lånekassens designsystem for at komponentene skal vises korrekt. [Se design.lanekassen.no](https://design.lanekassen.no/).

React:

```tsx
import { SamtykkeBanner } from "@lanekassen/portal-samtykke";

<SamtykkeBanner
	config={{
		monitorEndepunkt: "/api/monitor",
		teksterEndepunkt: "/api/tekster",
	}}
/>;
```

Native DOM:

Importer modulen `@lanekassen/portal-samtykke/web` og registrer HTML-elementet:

```html
<samtykke-banner
	monitor-endepunkt="/api/monitor"
	tekster-endepunkt="/api/tekster"
></samtykke-banner>
```