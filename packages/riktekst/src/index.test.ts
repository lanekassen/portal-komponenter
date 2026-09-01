import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText, type RichTextProps } from "./index";
import { complexCmsOutput } from "./test-data";

function render(value: RichTextProps["value"]): string {
  return renderToStaticMarkup(createElement(RichText, { value }));
}

describe("RichText", () => {
  it("renders nested CMS output with Designsystemet classes during SSR", () => {
    expect(
      render({
        tagName: "p",
        attributes: { class: "lead", "data-id": 42 },
        children: [
          { text: "Read " },
          {
            tagName: "a",
            attributes: {
              href: "/more",
              hidden: false,
              ignored: {},
              title: "More",
            },
            text: "more",
          },
          { text: "." },
        ],
      }),
    ).toBe(
      '<p data-id="42" class="ds-paragraph">Read <a href="/more" title="More" class="ds-link">more</a>.</p>',
    );
  });

  it("strips CMS class attributes from unstyled elements", () => {
    expect(
      render({
        tagName: "strong",
        attributes: { class: "cms-class" },
        text: "Important",
      }),
    ).toBe("<strong>Important</strong>");
  });

  it("renders a text-only value", () => {
    expect(render({ text: "Plain text" })).toBe("Plain text");
  });

  it("escapes text and attributes", () => {
    expect(
      render({
        tagName: "p",
        attributes: {
          title: `A "quoted" & <title>`,
        },
        text: `<script>alert("x")</script> & 'text'`,
      }),
    ).toBe(
      '<p title="A &quot;quoted&quot; &amp; &lt;title&gt;" class="ds-paragraph">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#x27;text&#x27;</p>',
    );
  });

  it("omits event handlers and unsafe URLs", () => {
    expect(
      render({
        tagName: "a",
        attributes: {
          href: "java\nscript:alert(1)",
          onclick: "alert(1)",
          title: "Safe title",
        },
        text: "Link",
      }),
    ).toBe('<a title="Safe title" class="ds-link">Link</a>');
  });

  it("omits executable elements and React special props", () => {
    expect(
      render({
        children: [
          { tagName: "script", text: "alert(1)" },
          {
            tagName: "p",
            attributes: {
              style: "color: red",
              dangerouslySetInnerHTML: "invalid",
            },
            text: "Safe text",
          },
        ],
      }),
    ).toBe('<p class="ds-paragraph">Safe text</p>');
  });

  it("renders CMS #text nodes without creating an element", () => {
    expect(
      render({
        tagName: "P",
        children: [
          { tagName: "#TEXT", text: "A " },
          { tagName: "STRONG", children: [{ tagName: "#TEXT", text: "word" }] },
        ],
      }),
    ).toBe('<p class="ds-paragraph">A <strong>word</strong></p>');
  });

  it("renders a CMS #document wrapper without creating an element", () => {
    expect(
      render({
        tagName: "#DOCUMENT",
        children: [
          { tagName: "P", children: [{ tagName: "#TEXT", text: "First." }] },
          { tagName: "#TEXT", text: "\n" },
          { tagName: "P", children: [{ tagName: "#text", text: "Second." }] },
        ],
      }),
    ).toBe(
      '<p class="ds-paragraph">First.</p>\n<p class="ds-paragraph">Second.</p>',
    );
  });

  it("normalizes uppercase CMS tag names", () => {
    expect(render({ tagName: "STRONG", text: "Important" })).toBe(
      "<strong>Important</strong>",
    );
  });

  it("applies the Designsystemet heading and list classes", () => {
    expect(render({ tagName: "H2", text: "Heading" })).toBe(
      '<h2 class="ds-heading">Heading</h2>',
    );
  });

  it("applies the Designsystemet list class to ordered and unordered lists", () => {
    expect(
      render({
        children: [
          { tagName: "UL", children: [{ tagName: "LI", text: "One" }] },
          { tagName: "OL", children: [{ tagName: "LI", text: "Two" }] },
        ],
      }),
    ).toBe(
      '<ul class="ds-list"><li>One</li></ul><ol class="ds-list"><li>Two</li></ol>',
    );
  });

  it("renders complex CMS output correctly", () => {
    expect(
      render(complexCmsOutput),
    ).toBe(`<p class="ds-paragraph">Hallo feilmelding</p>
<p class="ds-paragraph">Her er en liste</p>
<ol class="ds-list">
<li>Uno</li>
<li>dos</li>
<li>tres</li>
</ol>
<p class="ds-paragraph">\u00a0</p>
<p class="ds-paragraph">Bullets</p>
<ul class="ds-list">
<li>pew</li>
<li>pew</li>
<li>pew</li>
</ul>
<p class="ds-paragraph">\u00a0</p>
<p class="ds-paragraph"><strong>Bold</strong></p>
<p class="ds-paragraph"><em>Italics</em></p>
<p class="ds-paragraph">\u00a0</p>
<p class="ds-paragraph"><dfn title="hemmlig tekst">Hjelp tekst åøæ</dfn></p>
<p class="ds-paragraph">\u00a0</p>
<p class="ds-paragraph">mixed <strong>in </strong><em>text </em>here</p>
<p class="ds-paragraph">\u00a0</p>
<h2 class="ds-heading">heading</h2>
<p class="ds-paragraph">wowow</p>
<a href="/nb-NO/dinesider" class="ds-link">Dinesider</a>
<div data-contentid="ddb240c2-b339-4b1a-896a-711b1ceb575c">Blokk</div>`);
  });
});
