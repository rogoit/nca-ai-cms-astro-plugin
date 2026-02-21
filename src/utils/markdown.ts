import { marked } from "marked";
import { sanitizeMarkdownHtml } from "./sanitize.js";

/**
 * Converts a markdown string to sanitized HTML.
 *
 * Always use this function instead of calling `marked()` directly --
 * bare marked output is unsanitized and vulnerable to XSS.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const rawHtml = await marked(markdown);
  return sanitizeMarkdownHtml(rawHtml);
}
