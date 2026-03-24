import { describe, it, expect, vi } from 'vitest';

vi.mock('astro:db', () => ({
  db: {},
  SiteSettings: {},
  Prompts: {},
  eq: vi.fn(),
}));

import { validateImportPayload, type DbTransferPayload } from './DbTransferService.js';

describe('validateImportPayload', () => {
  it('accepts a valid payload with both sections', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: [{ key: 'content.branche', value: 'Tech', updatedAt: '2026-03-24T12:00:00.000Z' }],
      prompts: [{ id: 'p1', name: 'Blog', category: 'content', promptText: 'Write...', updatedAt: '2026-03-24T12:00:00.000Z' }],
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts payload with only siteSettings (partial import)', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: [{ key: 'k', value: 'v', updatedAt: '2026-03-24T12:00:00.000Z' }],
    });
    expect(result.valid).toBe(true);
  });

  it('accepts payload with only prompts (partial import)', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      prompts: [{ id: 'p1', name: 'n', category: 'c', promptText: 't', updatedAt: '2026-03-24T12:00:00.000Z' }],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects payload with neither siteSettings nor prompts', () => {
    const result = validateImportPayload({ version: 1, exportedAt: '2026-03-24T12:00:00.000Z' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least one'))).toBe(true);
  });

  it('rejects payload without version field', () => {
    const result = validateImportPayload({ siteSettings: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('rejects unsupported version', () => {
    const result = validateImportPayload({
      version: 99,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('rejects siteSettings row missing key', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: [{ value: 'v', updatedAt: '2026-03-24T12:00:00.000Z' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('siteSettings'))).toBe(true);
  });

  it('rejects prompts row missing id', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      prompts: [{ name: 'n', category: 'c', promptText: 't', updatedAt: '2026-03-24T12:00:00.000Z' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('prompts'))).toBe(true);
  });

  it('accepts empty arrays (valid but no-op)', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: [],
      prompts: [],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects non-array siteSettings', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      siteSettings: 'not an array',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('siteSettings'))).toBe(true);
  });
});
