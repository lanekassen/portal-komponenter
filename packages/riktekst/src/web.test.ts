import { describe, expect, it, vi } from "vitest";
import { complexCmsOutput } from "./test-data";
import { type HtmlParsedOutput, renderRichText } from "./web";

function render(value: HtmlParsedOutput): HTMLDivElement {
  const container = document.createElement("div");
  container.append(renderRichText(value));
  return container;
}

describe("renderRichText", () => {
  it("renders nested CMS text and primitive attributes", () => {
    const container = render({
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
    });

    expect(container.innerHTML).toBe(
      '<p data-id="42" class="ds-paragraph">Read <a href="/more" title="More" class="ds-link">more</a>.</p>',
    );
  });

  it("strips CMS class attributes from unstyled elements", () => {
    const container = render({
      tagName: "strong",
      attributes: { class: "cms-class" },
      text: "Important",
    });

    expect(container.innerHTML).toBe("<strong>Important</strong>");
  });

  it("renders a text-only value", () => {
    const container = render({ text: "Plain text" });

    expect(container.textContent).toBe("Plain text");
  });

  it("escapes text and attributes", () => {
    const container = render({
      tagName: "p",
      attributes: { title: `A "quoted" & <title>` },
      text: `<script>alert("x")</script> & 'text'`,
    });

    const paragraph = container.querySelector("p");
    expect(paragraph?.getAttribute("title")).toBe(`A "quoted" & <title>`);
    expect(paragraph?.textContent).toBe(`<script>alert("x")</script> & 'text'`);
    expect(paragraph?.innerHTML).toBe(
      "&lt;script&gt;alert(\"x\")&lt;/script&gt; &amp; 'text'",
    );
  });

  it("omits event handlers and unsafe URLs", () => {
    const container = render({
      tagName: "a",
      attributes: {
        href: "java\nscript:alert(1)",
        onclick: "alert(1)",
        title: "Safe title",
      },
      text: "Link",
    });

    expect(container.innerHTML).toBe(
      '<a title="Safe title" class="ds-link">Link</a>',
    );
  });

  it("omits executable elements", () => {
    const container = render({
      children: [
        { tagName: "script", text: "window.injected = true" },
        {
          tagName: "p",
          attributes: {
            style: "color: red",
            dangerouslySetInnerHTML: "invalid",
          },
          text: "Safe text",
        },
      ],
    });

    expect(container.innerHTML).toBe('<p class="ds-paragraph">Safe text</p>');
  });

  it("renders CMS #text nodes without creating an element", () => {
    const container = render({
      tagName: "P",
      children: [
        { tagName: "#text", text: "A " },
        { tagName: "STRONG", children: [{ tagName: "#text", text: "word" }] },
      ],
    });

    expect(container.innerHTML).toBe(
      '<p class="ds-paragraph">A <strong>word</strong></p>',
    );
  });

  it("renders a CMS #document wrapper without creating an element", () => {
    const container = render({
      tagName: "#DOCUMENT",
      children: [
        {
          tagName: "P",
          children: [{ tagName: "#TEXT", text: "First paragraph." }],
        },
        { tagName: "#TEXT", text: "\n" },
        {
          tagName: "P",
          children: [{ tagName: "#text", text: "Second paragraph." }],
        },
      ],
    });

    expect(container.innerHTML).toBe(
      '<p class="ds-paragraph">First paragraph.</p>\n<p class="ds-paragraph">Second paragraph.</p>',
    );
  });

  it("normalizes uppercase CMS tag names", () => {
    const createElement = vi.spyOn(document, "createElement");

    renderRichText({ tagName: "STRONG", text: "Important" });

    expect(createElement).toHaveBeenCalledWith("strong");
  });

  it("applies the Designsystemet heading class", () => {
    const container = render({ tagName: "H2", text: "Heading" });

    expect(
      container.querySelector("h2")?.classList.contains("ds-heading"),
    ).toBe(true);
  });

  it("applies the Designsystemet list class to ordered and unordered lists", () => {
    const container = render({
      children: [
        { tagName: "UL", children: [{ tagName: "LI", text: "One" }] },
        { tagName: "OL", children: [{ tagName: "LI", text: "Two" }] },
      ],
    });

    expect(container.querySelector("ul")?.classList.contains("ds-list")).toBe(
      true,
    );
    expect(container.querySelector("ol")?.classList.contains("ds-list")).toBe(
      true,
    );
  });

  it("renders complex CMS output correctly", () => {
    const container = render(complexCmsOutput);

    expect(
      container.innerHTML,
    ).toBe(`<p class="ds-paragraph">Hallo feilmelding</p>
<p class="ds-paragraph">Her er en liste</p>
<ol class="ds-list">
<li>Uno</li>
<li>dos</li>
<li>tres</li>
</ol>
<p class="ds-paragraph">&nbsp;</p>
<p class="ds-paragraph">Bullets</p>
<ul class="ds-list">
<li>pew</li>
<li>pew</li>
<li>pew</li>
</ul>
<p class="ds-paragraph">&nbsp;</p>
<p class="ds-paragraph"><strong>Bold</strong></p>
<p class="ds-paragraph"><em>Italics</em></p>
<p class="ds-paragraph">&nbsp;</p>
<p class="ds-paragraph"><dfn title="hemmlig tekst">Hjelp tekst åøæ</dfn></p>
<p class="ds-paragraph">&nbsp;</p>
<p class="ds-paragraph">mixed <strong>in </strong><em>text </em>here</p>
<p class="ds-paragraph">&nbsp;</p>
<h2 class="ds-heading">heading</h2>
<p class="ds-paragraph">wowow</p>
<a href="/nb-NO/dinesider" class="ds-link">Dinesider</a>
<div data-contentid="ddb240c2-b339-4b1a-896a-711b1ceb575c">Blokk</div>`);
  });
});
