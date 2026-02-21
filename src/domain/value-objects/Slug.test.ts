import { describe, it, expect } from 'vitest';
import { Slug } from './Slug';

describe('Slug', () => {
  it('generates lowercase slug from title', () => {
    const slug = new Slug('HTML Accessibility');
    expect(slug.toString()).toBe('html-accessibility');
  });

  it('handles German umlauts', () => {
    const slug = new Slug('Barrierefreiheit für Anfänger');
    expect(slug.toString()).toBe('barrierefreiheit-fuer-anfaenger');
  });

  it('handles special characters', () => {
    const slug = new Slug('Forms & Inputs: A Guide!');
    expect(slug.toString()).toBe('forms-inputs-a-guide');
  });

  it('removes multiple consecutive hyphens', () => {
    const slug = new Slug('Test   Multiple   Spaces');
    expect(slug.toString()).toBe('test-multiple-spaces');
  });

  it('trims hyphens from start and end', () => {
    const slug = new Slug('---Title---');
    expect(slug.toString()).toBe('title');
  });

  it('handles German ß correctly', () => {
    const slug = new Slug('Größe und Maße');
    expect(slug.toString()).toBe('groesse-und-masse');
  });

  it('compares slugs for equality', () => {
    const slug1 = new Slug('Test Title');
    const slug2 = new Slug('test-title');
    expect(slug1.equals(slug2)).toBe(true);
  });

  it('returns false for unequal slugs', () => {
    const slug1 = new Slug('First Title');
    const slug2 = new Slug('Second Title');
    expect(slug1.equals(slug2)).toBe(false);
  });

  it('handles NFD normalization for accented characters', () => {
    const slug = new Slug('Café Résumé');
    expect(slug.toString()).toBe('cafe-resume');
  });
});
