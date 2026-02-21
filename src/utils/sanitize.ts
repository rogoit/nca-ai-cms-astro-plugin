import sanitize from "sanitize-html";

const MARKDOWN_ALLOWED_TAGS: string[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "hr",
  "br",
  "div",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "del",
  "s",
  "sub",
  "sup",
  "mark",
  "img",
  "dl",
  "dt",
  "dd",
];

const MARKDOWN_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  td: ["align"],
  th: ["align"],
  code: ["class"],
  pre: ["class"],
  "*": ["id"],
};

const MARKDOWN_ALLOWED_SCHEMES: Record<string, string[]> = {
  a: ["http", "https", "mailto"],
  img: ["http", "https", "data"],
};

/**
 * Sanitizes HTML produced from markdown rendering using an allowlist approach.
 * Strips all tags, attributes, and URI schemes not explicitly permitted.
 */
export function sanitizeMarkdownHtml(dirtyHtml: string): string {
  return sanitize(dirtyHtml, {
    allowedTags: MARKDOWN_ALLOWED_TAGS,
    allowedAttributes: MARKDOWN_ALLOWED_ATTRIBUTES,
    allowedSchemes: MARKDOWN_ALLOWED_SCHEMES.a,
    allowedSchemesByTag: MARKDOWN_ALLOWED_SCHEMES,
    allowProtocolRelative: false,
  });
}

/**
 * Escapes dangerous sequences in a JSON string intended for embedding
 * inside a `<script type="application/ld+json">` block.
 *
 * Prevents premature script tag closure and HTML comment injection.
 */
export function escapeJsonLd(jsonString: string): string {
  return jsonString
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
}

/**
 * Encodes special HTML characters as entities.
 * Use for interpolating untrusted text into HTML element content.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
