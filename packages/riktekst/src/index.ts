import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  getDesignsystemetClass,
  getPrimitiveAttributes,
  isUnsafeAttribute,
  isUnsafeTagName,
  normalizeTagName,
} from "./render-utils";
import type { HtmlParsedOutput } from "./web";

export interface RichTextProps {
  value: HtmlParsedOutput;
}

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  class: "className",
  for: "htmlFor",
  readonly: "readOnly",
  tabindex: "tabIndex",
};

export function RichText({ value }: RichTextProps): ReactElement {
  return createElement(Fragment, null, renderNode(value));
}

function renderNode(value: HtmlParsedOutput): ReactNode {
  const children =
    value.children?.map((child, index) =>
      createElement(Fragment, { key: index }, renderNode(child)),
    ) ?? [];

  const tagName = value.tagName ? normalizeTagName(value.tagName) : undefined;
  if (!tagName || tagName === "#text" || tagName === "#document") {
    return createElement(Fragment, null, value.text, ...children);
  }

  if (isUnsafeTagName(tagName)) return null;

  const attributes = toReactAttributes(value.attributes, tagName);
  return createElement(tagName, attributes, value.text, ...children);
}

function toReactAttributes(
  attributes: Record<string, unknown> | null | undefined,
  tagName: string,
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};

  getPrimitiveAttributes(attributes).forEach(([attributeName, value]) => {
    if (isUnsafeAttribute(attributeName, value)) return;

    const propName =
      REACT_ATTRIBUTE_NAMES[attributeName.toLowerCase()] ?? attributeName;
    props[propName] = value;
  });

  const className = getDesignsystemetClass(tagName);
  if (className && !props.className) {
    props.className = className;
  } else if (
    className &&
    typeof props.className === "string" &&
    !props.className.split(/\s+/).includes(className)
  ) {
    props.className = `${props.className} ${className}`;
  }

  return props;
}
