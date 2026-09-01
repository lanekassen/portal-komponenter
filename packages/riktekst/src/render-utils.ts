import type { HtmlParsedOutput } from "./web";

export type PrimitiveAttributeValue = string | number | boolean;

const DESIGNSYSTEMET_CLASSES: Readonly<Record<string, string>> = {
  a: "ds-link",
  h1: "ds-heading",
  h2: "ds-heading",
  h3: "ds-heading",
  h4: "ds-heading",
  h5: "ds-heading",
  h6: "ds-heading",
  ol: "ds-list",
  p: "ds-paragraph",
  ul: "ds-list",
};

const UNSAFE_TAG_NAMES = new Set([
  "applet",
  "base",
  "embed",
  "iframe",
  "link",
  "math",
  "meta",
  "object",
  "script",
  "style",
  "svg",
]);

export function normalizeTagName(tagName: string): string {
  return tagName.toLowerCase();
}

export function isUnsafeTagName(tagName: string): boolean {
  return UNSAFE_TAG_NAMES.has(tagName);
}

export function getDesignsystemetClass(tagName: string): string | undefined {
  return Object.hasOwn(DESIGNSYSTEMET_CLASSES, tagName)
    ? DESIGNSYSTEMET_CLASSES[tagName]
    : undefined;
}

export function getPrimitiveAttributes(
  attributes: HtmlParsedOutput["attributes"],
): [string, PrimitiveAttributeValue][] {
  return Object.entries(attributes ?? {}).filter(
    (entry): entry is [string, PrimitiveAttributeValue] => {
      // CMS classes are discarded; Designsystemet classes are added by the renderer.
      if (entry[0].toLowerCase() === "class") return false;

      const value = entry[1];
      return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      );
    },
  );
}

export function isBooleanAttribute(
  value: PrimitiveAttributeValue,
): value is boolean {
  return typeof value === "boolean";
}

export function isUnsafeAttribute(
  name: string,
  value: PrimitiveAttributeValue,
): boolean {
  if (/^(dangerouslysetinnerhtml|style)$/i.test(name)) return true;
  if (/^on/i.test(name)) return true;
  if (!/^(href|src|action|formaction|xlink:href)$/i.test(name)) return false;

  const normalizedValue = Array.from(String(value))
    .filter((character) => character.charCodeAt(0) > 0x20)
    .join("")
    .toLowerCase();
  return (
    normalizedValue.startsWith("javascript:") ||
    normalizedValue.startsWith("vbscript:") ||
    normalizedValue.startsWith("data:text/html")
  );
}
