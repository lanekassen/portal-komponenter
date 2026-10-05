import {
  getDesignsystemetClass,
  getNodeText,
  getNonEmptyStringAttribute,
  getPrimitiveAttributes,
  isBooleanAttribute,
  isUnsafeAttribute,
  isUnsafeTagName,
  normalizeTagName,
  omitAttribute,
} from "./render-utils";

export interface HtmlParsedOutput {
  tagName?: string | null;
  text?: string | null;
  attributes?: Record<string, unknown> | null;
  children?: readonly HtmlParsedOutput[] | null;
}

interface RenderedTag {
  node: Node;
  content: Node;
}

type CustomTagRenderer = (value: HtmlParsedOutput) => RenderedTag | undefined;

const CUSTOM_TAG_RENDERERS: Readonly<Record<string, CustomTagRenderer>> = {
  dfn: createDefinitionPopover,
};

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

    const customTag = Object.hasOwn(CUSTOM_TAG_RENDERERS, tagName)
      ? CUSTOM_TAG_RENDERERS[tagName]?.(value)
      : undefined;
    const { node, content } = customTag ?? createDefaultTag(tagName, value);

    if (value.text) content.appendChild(document.createTextNode(value.text));
    value.children?.forEach((child) => {
      appendNode(content, child);
    });
    parent.appendChild(node);
    return;
  }

  if (value.text) parent.appendChild(document.createTextNode(value.text));
  value.children?.forEach((child) => {
    appendNode(parent, child);
  });
}

function createDefaultTag(
  tagName: string,
  value: HtmlParsedOutput,
): RenderedTag {
  const element = document.createElement(tagName);
  setAttributes(element, value.attributes);
  applyDesignsystemetClass(element, tagName);
  return { node: element, content: element };
}

function createDefinitionPopover(value: HtmlParsedOutput): RenderedTag {
  const title = getNonEmptyStringAttribute(value.attributes, "title");
  const fragment = document.createDocumentFragment();

  if (title === undefined) {
    return { node: fragment, content: fragment };
  }

  const id = `popover-${crypto.randomUUID()}`;
  const trigger = document.createElement("button");
  setAttributes(trigger, omitAttribute(value.attributes, "title"));
  trigger.setAttribute("type", "button");
  trigger.setAttribute("data-popover", "inline");
  trigger.setAttribute("popovertarget", id);

  const popover = document.createElement("span");
  popover.id = id;
  popover.className = "ds-popover";
  popover.setAttribute("popover", "auto");
  popover.setAttribute("data-color", "neutral");
  popover.setAttribute("data-placement", "top");
  const term = document.createElement("strong");
  term.style.display = "block";
  term.textContent = getNodeText(value);
  popover.append(term, title);
  fragment.append(trigger, popover);

  return { node: fragment, content: trigger };
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
