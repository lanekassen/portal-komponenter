import {
  type ComponentType,
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import {
  getDesignsystemetClass,
  getNodeText,
  getNonEmptyStringAttribute,
  getPrimitiveAttributes,
  isUnsafeAttribute,
  isUnsafeTagName,
  normalizeTagName,
  omitAttribute,
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

type CustomTagProps = {
  value: HtmlParsedOutput;
  children?: ReactNode;
};

const CUSTOM_TAG_RENDERERS: Readonly<
  Record<string, ComponentType<CustomTagProps>>
> = {
  dfn: DefinitionPopover,
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

  if (Object.hasOwn(CUSTOM_TAG_RENDERERS, tagName)) {
    const CustomTag = CUSTOM_TAG_RENDERERS[tagName];
    if (CustomTag) {
      return (
        <CustomTag value={value}>
          {value.text}
          {children}
        </CustomTag>
      );
    }
  }

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

function DefinitionPopover({ value, children }: CustomTagProps): ReactNode {
  const id = `popover-${useId()}`;
  const title = getNonEmptyStringAttribute(value.attributes, "title");

  if (title === undefined) {
    return children;
  }

  const text = getNodeText(value);

  return (
    <>
      <button
        {...toReactAttributes(
          omitAttribute(value.attributes, "title"),
          "button",
        )}
        type="button"
        data-popover="inline"
        popoverTarget={id}
      >
        {children}
      </button>
      <span
        id={id}
        popover="auto"
        className="ds-popover"
        data-color="neutral"
        data-placement="top"
      >
        <strong style={{ display: "block" }}>{text}</strong>
        {title}
      </span>
    </>
  );
}
