import { describe, it, expect, vi } from 'vitest';

vi.mock('astro:db', () => ({
  db: {},
  SiteSettings: {},
  Prompts: {},
  ScheduledPosts: {},
}));

import { validateImportPayload, type DbTransferPayload } from './DbTransferService.js';

describe('validateImportPayload', () => {
  it('accepts a valid payload with all three tables', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: {
        siteSettings: [{ key: 'content.branche', value: 'Tech', updatedAt: '2026-03-24T12:00:00.000Z' }],
        prompts: [],
        scheduledPosts: [],
      },
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects payload without version field', () => {
    const result = validateImportPayload({ tables: {} } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('version'))).toBe(true);
  });

  it('rejects payload with unsupported version', () => {
    const result = validateImportPayload({
      version: 99,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: { siteSettings: [], prompts: [], scheduledPosts: [] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('version'))).toBe(true);
  });

  it('rejects payload without tables field', () => {
    const result = validateImportPayload({ version: 1 } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('tables'))).toBe(true);
  });

  it('rejects payload with missing table keys', () => {
    const result = validateImportPayload({
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: { siteSettings: [] },
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('prompts'))).toBe(true);
    expect(result.errors.some((e: string) => e.includes('scheduledPosts'))).toBe(true);
  });

  it('rejects siteSettings row missing required key field', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: {
        siteSettings: [{ value: 'Tech', updatedAt: '2026-03-24T12:00:00.000Z' } as any],
        prompts: [],
        scheduledPosts: [],
      },
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('siteSettings'))).toBe(true);
  });

  it('rejects prompts row missing required id field', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: {
        siteSettings: [],
        prompts: [{ name: 'test', category: 'c', promptText: 'p', updatedAt: '2026-03-24T12:00:00.000Z' } as any],
        scheduledPosts: [],
      },
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('prompts'))).toBe(true);
  });

  it('rejects scheduledPosts row missing required scheduledDate', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: {
        siteSettings: [],
        prompts: [],
        scheduledPosts: [{
          id: '1', input: 'x', inputType: 'text', status: 'pending', createdAt: '2026-03-24T12:00:00.000Z',
        } as any],
      },
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('scheduledPosts'))).toBe(true);
  });

  it('accepts payload with empty tables (clears all data)', () => {
    const payload: DbTransferPayload = {
      version: 1,
      exportedAt: '2026-03-24T12:00:00.000Z',
      tables: {
        siteSettings: [],
        prompts: [],
        scheduledPosts: [],
      },
    };
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(true);
  });
});
