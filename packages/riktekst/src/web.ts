import {
  getDesignsystemetClass,
  getPrimitiveAttributes,
  isBooleanAttribute,
  isUnsafeAttribute,
  isUnsafeTagName,
  normalizeTagName,
} from "./render-utils";

export interface HtmlParsedOutput {
  tagName?: string | null;
  text?: string | null;
  attributes?: Record<string, unknown> | null;
  children?: readonly HtmlParsedOutput[] | null;
}

export function renderRichText(value: HtmlParsedOutput): DocumentFragment {
  const fragment = document.createDocumentFragment();
  appendNode(fragment, value);
  return fragment;
}

function appendNode(parent: Node, value: HtmlParsedOutput): void {
  if (value.tagName) {
    const tagName = normalizeTagName(value.tagName);
    if (isUnsafeTagName(tagName)) return;

    if (tagName === "#text" || tagName === "#document") {
      if (value.text) parent.appendChild(document.createTextNode(value.text));
      value.children?.forEach((child) => {
        appendNode(parent, child);
      });
      return;
    }

    const element = document.createElement(tagName);
    setAttributes(element, value.attributes);
    applyDesignsystemetClass(element, tagName);
    parent.appendChild(element);

    if (value.text) element.appendChild(document.createTextNode(value.text));
    value.children?.forEach((child) => {
      appendNode(element, child);
    });
    return;
  }

  if (value.text) parent.appendChild(document.createTextNode(value.text));
  value.children?.forEach((child) => {
    appendNode(parent, child);
  });
}

function applyDesignsystemetClass(element: Element, tagName: string): void {
  const className = getDesignsystemetClass(tagName);

  if (className) element.classList.add(className);
}

function setAttributes(
  element: Element,
  attributes: Record<string, unknown> | null | undefined,
): void {
  getPrimitiveAttributes(attributes).forEach(([name, value]) => {
    if (isUnsafeAttribute(name, value)) return;

    if (isBooleanAttribute(value)) {
      element.toggleAttribute(name, value);
      return;
    }
    element.setAttribute(name, String(value));
  });
}
