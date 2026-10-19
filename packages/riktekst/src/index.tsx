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
  value?: HtmlParsedOutput;
  components?: RichTextComponents;
}

export interface RichTextComponentProps {
  value: HtmlParsedOutput;
  attributes: Record<string, string | number | boolean>;
  children?: ReactNode;
}

export type RichTextComponents = Readonly<
  Record<string, ComponentType<RichTextComponentProps> | undefined>
>;

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  class: "className",
  for: "htmlFor",
  readonly: "readOnly",
  tabindex: "tabIndex",
};

const CUSTOM_TAG_RENDERERS: RichTextComponents = {
  dfn: DefinitionPopover,
};

export function RichText({
  value = {},
  components,
}: RichTextProps): ReactElement {
  const renderers: RichTextComponents = {
    ...CUSTOM_TAG_RENDERERS,
    ...Object.fromEntries(
      Object.entries(components ?? {}).filter(
        ([, component]) => component !== undefined,
      ),
    ),
  };

  return createElement(Fragment, null, renderNode(value, renderers));
}

function renderNode(
  value: HtmlParsedOutput,
  renderers: RichTextComponents,
): ReactNode {
  const children =
    value.children?.map((child, index) =>
      createElement(Fragment, { key: index }, renderNode(child, renderers)),
    ) ?? [];

  const tagName = value.tagName ? normalizeTagName(value.tagName) : undefined;
  if (!tagName || tagName === "#text" || tagName === "#document") {
    return createElement(Fragment, null, value.text, ...children);
  }

  if (isUnsafeTagName(tagName)) return null;

  const attributes = toReactAttributes(value.attributes, tagName);
  const CustomTag = Object.hasOwn(renderers, tagName)
    ? renderers[tagName]
    : undefined;

  if (CustomTag) {
    return (
      <CustomTag value={value} attributes={attributes}>
        {value.text}
        {children}
      </CustomTag>
    );
  }

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

function DefinitionPopover({
  value,
  children,
}: RichTextComponentProps): ReactNode {
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
