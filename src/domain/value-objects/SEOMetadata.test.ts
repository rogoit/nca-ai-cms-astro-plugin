import { describe, it, expect } from 'vitest';
import { SEOMetadata } from './SEOMetadata';

describe('SEOMetadata', () => {
  it('creates valid metadata', () => {
    const meta = new SEOMetadata('Test Title', 'Test description');
    expect(meta.title).toBe('Test Title');
    expect(meta.description).toBe('Test description');
  });

  it('truncates title over 60 characters with ellipsis', () => {
    const longTitle = 'A'.repeat(70);
    const meta = new SEOMetadata(longTitle, 'desc');
    expect(meta.title.length).toBe(60);
    expect(meta.title.endsWith('...')).toBe(true);
  });

  it('truncates description over 155 characters with ellipsis', () => {
    const longDesc = 'A'.repeat(200);
    const meta = new SEOMetadata('title', longDesc);
    expect(meta.description.length).toBe(155);
    expect(meta.description.endsWith('...')).toBe(true);
  });

  it('accepts exactly 60 character title', () => {
    const title = 'A'.repeat(60);
    const meta = new SEOMetadata(title, 'desc');
    expect(meta.title.length).toBe(60);
    expect(meta.title).not.toContain('...');
  });

  it('accepts exactly 155 character description', () => {
    const desc = 'A'.repeat(155);
    const meta = new SEOMetadata('title', desc);
    expect(meta.description.length).toBe(155);
    expect(meta.description).not.toContain('...');
  });

  it('preserves short title without modification', () => {
    const meta = new SEOMetadata('Short', 'desc');
    expect(meta.title).toBe('Short');
  });

  it('preserves short description without modification', () => {
    const meta = new SEOMetadata('title', 'Short');
    expect(meta.description).toBe('Short');
  });
});
