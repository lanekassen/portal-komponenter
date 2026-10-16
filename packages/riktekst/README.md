# @lanekassen/portal-riktekst

Rendrer CMS-output som React-elementer eller DOM-noder.

> [!NOTE]
> Applikasjonen må inkludere CSS og temavariabler fra Lånekassens designsystem for at komponentene skal vises korrekt. [Se design.lanekassen.no](https://design.lanekassen.no/).

## React

```tsx
import { RichText } from "@lanekassen/portal-riktekst";

<RichText value={{ tagName: "p", text: "Hei!" }} />
```

Overstyr tagger med `components`, for eksempel med `Link` fra Next.js:

```tsx
import Link from "next/link";
import { RichText, type RichTextComponentProps } from "@lanekassen/portal-riktekst";

function NextLink({ attributes, children }: RichTextComponentProps) {
  const { href, ...rest } = attributes;

  if (typeof href !== "string") {
    return <a {...rest}>{children}</a>;
  }

  return <Link {...rest} href={href}>{children}</Link>;
}

<RichText
  value={{ tagName: "a", attributes: { href: "/hjelp" }, text: "Hjelp" }}
  components={{ a: NextLink }}
/>
```

## Native DOM

```ts
import { renderRichText, type HtmlParsedOutput  } from "@lanekassen/portal-riktekst/web";

const tekst: HtmlParsedOutput = { tagName: "p", text: "Hei!" };
const container = document.querySelector("#innhold");
container?.append(renderRichText(tekst));
```

Overstyr tagger med `renderers`:

```ts
const fragment = renderRichText(
  { tagName: "a", attributes: { href: "/hjelp" }, text: "Hjelp" },
  {
    renderers: {
      a: ({ element }) => {
        element.classList.add("min-lenke");
        return element;
      },
    },
  },
);
container?.append(fragment);
```