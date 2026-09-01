# @lanekassen/portal-riktekst

Rendrer CMS-output som React-elementer eller DOM-noder.

> [!NOTE]
> Applikasjonen må inkludere CSS og temavariabler fra Lånekassens designsystem for at komponentene skal vises korrekt. [Se design.lanekassen.no](https://design.lanekassen.no/).

React:

```tsx
import { RichText } from "@lanekassen/portal-riktekst";

<RichText value={{ tagName: "p", text: "Hei!" }} />;
```

Native DOM:

```ts
import { renderRichText, type HtmlParsedOutput } from "@lanekassen/portal-riktekst/web";

const tekst: HtmlParsedOutput = { tagName: "p", text: "Hei!" };
const container = document.querySelector("#innhold");
container?.append(renderRichText(tekst));
```