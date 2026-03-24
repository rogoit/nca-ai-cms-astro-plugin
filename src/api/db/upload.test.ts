import { describe, it, expect } from 'vitest';

describe('DB Upload API (deprecated)', () => {
  it('returns 410 Gone with migration instructions', async () => {
    const { POST } = await import('./upload.js');

    const response = await POST({ request: new Request('http://localhost/api/db/upload', { method: 'POST' }) } as any);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toContain('/api/db/import');
  });
});
