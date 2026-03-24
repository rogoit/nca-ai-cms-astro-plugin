import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/dbUploadUtils.js', () => ({
  validateSqliteHeader: vi.fn((buf: Buffer) => {
    const header = buf.subarray(0, 16).toString('utf8');
    return header.startsWith('SQLite format 3');
  }),
  validateFileSize: vi.fn((size: number, max: number) => size <= max),
  backupDatabase: vi.fn().mockResolvedValue(undefined),
  writeDatabaseFile: vi.fn().mockResolvedValue(undefined),
  getDbPath: vi.fn(() => '.astro/content.db'),
  restartNodeProcess: vi.fn(),
}));

const SQLITE_HEADER = Buffer.from('SQLite format 3\0');

function createSqliteBuffer(size = 4096): Buffer {
  const buf = Buffer.alloc(size);
  SQLITE_HEADER.copy(buf);
  return buf;
}

function createFormDataRequest(file: Buffer, fieldName = 'database'): Request {
  const formData = new FormData();
  formData.append(fieldName, new Blob([file]), 'test.db');
  return new Request('http://localhost/api/db/upload', {
    method: 'POST',
    body: formData,
  });
}

function createOctetStreamRequest(file: Buffer): Request {
  return new Request('http://localhost/api/db/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  });
}

describe('DB Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid SQLite file via multipart/form-data', async () => {
    const { POST } = await import('./upload.js');
    const request = createFormDataRequest(createSqliteBuffer());

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.size).toBeGreaterThan(0);
  });

  it('accepts a valid SQLite file via application/octet-stream', async () => {
    const { POST } = await import('./upload.js');
    const request = createOctetStreamRequest(createSqliteBuffer());

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects non-SQLite files', async () => {
    const { POST } = await import('./upload.js');
    const badFile = Buffer.from('not a sqlite file');
    const request = createFormDataRequest(badFile);

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not a SQLite database');
  });

  it('rejects missing database field', async () => {
    const { POST } = await import('./upload.js');
    const formData = new FormData();
    formData.append('wrongfield', new Blob([createSqliteBuffer()]), 'test.db');
    const request = new Request('http://localhost/api/db/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No database file');
  });

  it('rejects invalid content type', async () => {
    const { POST } = await import('./upload.js');
    const request = new Request('http://localhost/api/db/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid content type');
  });

  it('creates a backup before writing', async () => {
    const { POST } = await import('./upload.js');
    const { backupDatabase } = await import('../../utils/dbUploadUtils.js');
    const request = createFormDataRequest(createSqliteBuffer());

    await POST({ request } as any);

    expect(backupDatabase).toHaveBeenCalled();
  });

  it('calls restartNodeProcess after successful upload', async () => {
    const { POST } = await import('./upload.js');
    const { restartNodeProcess } = await import('../../utils/dbUploadUtils.js');
    const request = createFormDataRequest(createSqliteBuffer());

    await POST({ request } as any);

    expect(restartNodeProcess).toHaveBeenCalledOnce();
  });

  it('rejects oversized file via multipart/form-data', async () => {
    const { POST } = await import('./upload.js');
    const oversized = createSqliteBuffer(50 * 1024 * 1024 + 1);
    const request = createFormDataRequest(oversized);

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toContain('too large');
  });

  it('rejects oversized file via application/octet-stream', async () => {
    const { POST } = await import('./upload.js');
    const oversized = createSqliteBuffer(50 * 1024 * 1024 + 1);
    const request = createOctetStreamRequest(oversized);

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toContain('too large');
  });

  it('includes deprecation notice in response', async () => {
    const { POST } = await import('./upload.js');
    const request = createFormDataRequest(createSqliteBuffer());

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(data.deprecated).toContain('/api/db/import');
  });
});
