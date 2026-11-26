import tinymceScriptSrc from "tinymce?url";
import { RichText, type RichTextProps } from "@lanekassen/portal-riktekst";
import type { ReactStory, ReactTypes } from "@storybook/react-vite";
import { Editor } from "@tinymce/tinymce-react";
import { type JSX, useMemo, useState } from "react";
import preview from "../.storybook/preview";
import hjelptekst from "./hjelptekst?url";

interface RichEditorProps {
  value: string;
  setValue: (value: string) => void;
}

function RichEditor({ value, setValue }: RichEditorProps): JSX.Element {
  return (
    <Editor
      value={value}
      onEditorChange={setValue}
      // TODO: THIS DOES NOT WORK
      // It fails at build time as tinymce expects it's entire fat folder to be available
      // Check what some internal tinymce apps do and copy paste
      tinymceScriptSrc={tinymceScriptSrc}
      // TODO: Is this allowed?
      licenseKey="gpl"
      init={{
        height: 500,
        menubar: false,
        plugins: "hjelptekst code link lists",
        external_plugins: {
          hjelptekst,
        },
        toolbar:
          "hjelptekst | undo redo | styles | link bullist numlist outdent indent | removeformat code",
      }}
    />
  );
}

const parser = new DOMParser();

const parseText = (text?: string | null) => text?.replace("\\n", "\n");

function parseNode(node?: Node | null): RichTextProps["value"] {
  if (!node) return;
  const attributes: Record<string, unknown> = {};
  if (node instanceof Element)
    Array.from(node.attributes).forEach((a) => {
      attributes[a.nodeName] = a.nodeValue;
    });
  const children = node.childNodes.length
    ? Array.from(node.childNodes).map(parseNode)
    : undefined;
  if (node instanceof Element && node.tagName)
    return { attributes, children, tagName: node.tagName.toLowerCase() };
  else if (node.textContent)
    return { text: parseText(node.textContent), tagName: "#text" };
  else return { children };
}

const meta = preview.meta({
  title: "Riktekst",
  component: RichText,
  render(args, { component: Component }) {
    const [value, setValue] = useState("");
    const val = useMemo(
      () =>
        parseNode(parser.parseFromString(value, "text/html").documentElement),
      [value],
    );
    console.log("VAL", val);
    return (
      <>
        <RichEditor value={value} setValue={setValue} />
        <div>
          <Component {...args} value={val} />
        </div>
      </>
    );
  },
});

export const Default: ReactStory<
  ReactTypes & {
    args: RichTextProps;
  },
  object
> = meta.story({});
