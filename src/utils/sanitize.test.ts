import { describe, it, expect } from "vitest";
import {
  sanitizeMarkdownHtml,
  escapeJsonLd,
  escapeHtml,
} from "./sanitize.js";

describe("sanitizeMarkdownHtml", () => {
  // --- Safe HTML preservation ---

  it("preserves basic paragraph content", () => {
    const html = "<p>Hello world</p>";
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves headings h1 through h6", () => {
    for (let i = 1; i <= 6; i++) {
      const html = `<h${i}>Heading ${i}</h${i}>`;
      expect(sanitizeMarkdownHtml(html)).toBe(html);
    }
  });

  it("preserves inline formatting tags", () => {
    const html =
      "<p><strong>bold</strong> <em>italic</em> <b>b</b> <i>i</i> <del>del</del> <s>strike</s></p>";
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves sub, sup, and mark tags", () => {
    const html = "<p><sub>sub</sub> <sup>sup</sup> <mark>marked</mark></p>";
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves links with permitted attributes", () => {
    const html =
      '<p><a href="https://example.com" title="Example" target="_blank" rel="noopener">link</a></p>';
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves images with permitted attributes", () => {
    const html =
      '<img src="https://example.com/img.png" alt="photo" title="Photo" width="100" height="50" loading="lazy" />';
    expect(sanitizeMarkdownHtml(html)).toContain('src="https://example.com/img.png"');
    expect(sanitizeMarkdownHtml(html)).toContain('alt="photo"');
    expect(sanitizeMarkdownHtml(html)).toContain('loading="lazy"');
  });

  it("preserves images with data: scheme", () => {
    const html = '<img src="data:image/png;base64,abc123" alt="inline" />';
    expect(sanitizeMarkdownHtml(html)).toContain("data:image/png;base64,abc123");
  });

  it("preserves code blocks with class attribute", () => {
    const html = '<pre class="language-ts"><code class="language-ts">const x = 1;</code></pre>';
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves unordered and ordered lists", () => {
    const ul = "<ul><li>one</li><li>two</li></ul>";
    const ol = "<ol><li>first</li><li>second</li></ol>";
    expect(sanitizeMarkdownHtml(ul)).toBe(ul);
    expect(sanitizeMarkdownHtml(ol)).toBe(ol);
  });

  it("preserves definition lists (dl, dt, dd)", () => {
    const html = "<dl><dt>Term</dt><dd>Definition</dd></dl>";
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves table elements with align attribute", () => {
    const html =
      '<table><thead><tr><th align="left">Col</th></tr></thead><tbody><tr><td align="right">Val</td></tr></tbody></table>';
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves blockquote, hr, and br tags", () => {
    const html = "<blockquote><p>Quote</p></blockquote><hr /><br />";
    expect(sanitizeMarkdownHtml(html)).toContain("<blockquote>");
    expect(sanitizeMarkdownHtml(html)).toContain("<hr");
    expect(sanitizeMarkdownHtml(html)).toContain("<br");
  });

  it("preserves id attribute on any element", () => {
    const html = '<h2 id="section-one">Section One</h2>';
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves div tags", () => {
    const html = "<div><p>Content</p></div>";
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  it("preserves mailto links", () => {
    const html = '<a href="mailto:test@example.com">Email</a>';
    expect(sanitizeMarkdownHtml(html)).toBe(html);
  });

  // --- XSS stripping ---

  it("strips script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeMarkdownHtml(html)).toBe("<p>Hello</p>");
  });

  it("strips event handler attributes", () => {
    const html = '<p onclick="alert(1)">Click me</p>';
    expect(sanitizeMarkdownHtml(html)).toBe("<p>Click me</p>");
  });

  it("strips javascript: scheme in links", () => {
    const html = '<a href="javascript:alert(1)">XSS</a>';
    expect(sanitizeMarkdownHtml(html)).not.toContain("javascript:");
  });

  it("strips iframe tags", () => {
    const html = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeMarkdownHtml(html)).toBe("");
  });

  it("strips style tags", () => {
    const html = "<style>body { display: none; }</style><p>Text</p>";
    expect(sanitizeMarkdownHtml(html)).toBe("<p>Text</p>");
  });

  it("strips disallowed attributes from allowed tags", () => {
    const html = '<p style="color:red" data-custom="x">Text</p>';
    expect(sanitizeMarkdownHtml(html)).toBe("<p>Text</p>");
  });
});

describe("escapeJsonLd", () => {
  it("escapes closing script tags", () => {
    const input = '{"name":"</script>"}';
    const result = escapeJsonLd(input);
    expect(result).not.toContain("</script>");
    expect(result).toContain("<\\/script>");
  });

  it("escapes closing script tags case-insensitively", () => {
    const input = '{"x":"</SCRIPT>"}';
    const result = escapeJsonLd(input);
    expect(result).not.toMatch(/<\/script>/i);
  });

  it("escapes HTML comments", () => {
    const input = '{"comment":"<!-- hidden -->"}';
    const result = escapeJsonLd(input);
    expect(result).not.toContain("<!--");
    expect(result).toContain("<\\!--");
  });

  it("returns unchanged string when nothing to escape", () => {
    const input = '{"name":"Safe String"}';
    expect(escapeJsonLd(input)).toBe(input);
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than and greater-than signs", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("escapes all special characters together", () => {
    expect(escapeHtml('<a href="x">&\'')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#039;",
    );
  });
});
