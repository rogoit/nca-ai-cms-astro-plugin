import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
  it("converts a heading to an h1 tag", async () => {
    const result = await renderMarkdown("# Hello");
    expect(result).toContain("<h1>Hello</h1>");
  });

  it("converts h2 and h3 headings", async () => {
    const result = await renderMarkdown("## Two\n\n### Three");
    expect(result).toContain("<h2>Two</h2>");
    expect(result).toContain("<h3>Three</h3>");
  });

  it("converts markdown links to anchor tags", async () => {
    const result = await renderMarkdown("[Example](https://example.com)");
    expect(result).toContain('<a href="https://example.com">Example</a>');
  });

  it("converts markdown images to img tags", async () => {
    const result = await renderMarkdown(
      "![Alt text](https://example.com/img.png)",
    );
    expect(result).toContain("<img");
    expect(result).toContain('src="https://example.com/img.png"');
    expect(result).toContain('alt="Alt text"');
  });

  it("strips script tags injected via markdown", async () => {
    const result = await renderMarkdown(
      'Hello <script>alert("xss")</script> world',
    );
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips event handlers from inline HTML", async () => {
    const result = await renderMarkdown(
      '<p onclick="alert(1)">Click</p>',
    );
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click");
  });

  it("returns empty string for empty input", async () => {
    const result = await renderMarkdown("");
    expect(result).toBe("");
  });

  it("converts blockquotes", async () => {
    const result = await renderMarkdown("> A wise quote");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("A wise quote");
  });

  it("converts inline formatting (bold, italic, strikethrough)", async () => {
    const result = await renderMarkdown(
      "**bold** *italic* ~~deleted~~",
    );
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
    expect(result).toContain("<del>deleted</del>");
  });
});
