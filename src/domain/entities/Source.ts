export class Source {
  readonly url: string;
  readonly domain: string;

  constructor(url: string) {
    if (!Source.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    if (!url.startsWith('https://')) {
      throw new Error('Only HTTPS URLs are allowed');
    }

    this.url = url;
    this.domain = Source.extractDomain(url);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static extractDomain(url: string): string {
    const parsed = new URL(url);
    return parsed.hostname;
  }

  isMDN(): boolean {
    return this.domain === 'developer.mozilla.org';
  }

  isW3C(): boolean {
    return this.domain.includes('w3.org');
  }

  toString(): string {
    return this.url;
  }
}
