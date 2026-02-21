import TurndownService from 'turndown';
import { Source } from '../domain/entities/Source';

export type FetchedContent = {
  title: string;
  content: string;
  url: string;
};

export class ContentFetcher {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Remove unwanted elements
    this.turndown.remove([
      'script',
      'style',
      'nav',
      'footer',
      'aside',
      'noscript',
    ]);
  }

  async fetch(source: Source): Promise<FetchedContent> {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }

    const html = await response.text();
    const title = this.extractTitle(html);
    const content = this.htmlToMarkdown(html);

    return {
      title,
      content,
      url: source.url,
    };
  }

  private extractTitle(html: string): string {
    // Try og:title first, then title tag
    const ogMatch = html.match(
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i
    );
    if (ogMatch?.[1]) return ogMatch[1].trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim() ?? 'Untitled';
  }

  private htmlToMarkdown(html: string): string {
    // Extract main content area first
    let content = html;

    const mainMatch =
      content.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      content.match(
        /<div[^>]*class="[^"]*(?:content|article|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );

    if (mainMatch?.[1]) {
      content = mainMatch[1];
    }

    // Convert to markdown using turndown
    const markdown = this.turndown.turndown(content);

    // Normalize whitespace
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  }
}
