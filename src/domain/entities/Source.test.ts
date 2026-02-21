import { describe, it, expect } from 'vitest';
import { Source } from './Source';

describe('Source', () => {
  it('creates source from valid HTTPS URL', () => {
    const source = new Source(
      'https://developer.mozilla.org/en-US/docs/Web/HTML'
    );
    expect(source.url).toBe(
      'https://developer.mozilla.org/en-US/docs/Web/HTML'
    );
  });

  it('extracts domain from URL', () => {
    const source = new Source(
      'https://developer.mozilla.org/en-US/docs/Web/HTML'
    );
    expect(source.domain).toBe('developer.mozilla.org');
  });

  it('throws error for HTTP URL', () => {
    expect(() => new Source('http://example.com')).toThrow(
      'Only HTTPS URLs are allowed'
    );
  });

  it('throws error for invalid URL', () => {
    expect(() => new Source('not-a-url')).toThrow('Invalid URL');
  });

  it('identifies MDN URLs', () => {
    const source = new Source(
      'https://developer.mozilla.org/en-US/docs/Web/HTML'
    );
    expect(source.isMDN()).toBe(true);
  });

  it('identifies W3C URLs', () => {
    const source = new Source('https://www.w3.org/WAI/WCAG21/quickref/');
    expect(source.isW3C()).toBe(true);
  });

  it('returns false for non-MDN URL', () => {
    const source = new Source('https://example.com');
    expect(source.isMDN()).toBe(false);
  });

  it('returns false for non-W3C URL', () => {
    const source = new Source('https://example.com');
    expect(source.isW3C()).toBe(false);
  });

  it('converts to string', () => {
    const source = new Source('https://developer.mozilla.org');
    expect(source.toString()).toBe('https://developer.mozilla.org');
  });
});
