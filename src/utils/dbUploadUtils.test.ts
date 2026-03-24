import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  validateSqliteHeader,
  validateFileSize,
  backupDatabase,
  writeDatabaseFile,
} from './dbUploadUtils.js';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0');

function createSqliteBuffer(size = 4096): Buffer {
  const buf = Buffer.alloc(size);
  SQLITE_HEADER.copy(buf);
  return buf;
}

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-upload-test-'));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('validateSqliteHeader', () => {
  it('returns true for a valid SQLite buffer', () => {
    expect(validateSqliteHeader(createSqliteBuffer())).toBe(true);
  });

  it('rejects a buffer that does not start with "SQLite format 3"', () => {
    expect(validateSqliteHeader(Buffer.from('not a sqlite file at all'))).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(validateSqliteHeader(Buffer.alloc(0))).toBe(false);
  });

  it('rejects a buffer shorter than 16 bytes', () => {
    expect(validateSqliteHeader(Buffer.from('SQLite'))).toBe(false);
  });

  it('rejects a buffer with similar but incorrect header', () => {
    const buf = Buffer.alloc(4096);
    Buffer.from('SQLite format 2\0').copy(buf);
    expect(validateSqliteHeader(buf)).toBe(false);
  });

  it('accepts a minimal 16-byte valid header', () => {
    expect(validateSqliteHeader(Buffer.from('SQLite format 3\0'))).toBe(true);
  });
});

describe('validateFileSize', () => {
  const MAX_SIZE = 50 * 1024 * 1024;

  it('accepts a file within the size limit', () => {
    expect(validateFileSize(1024, MAX_SIZE)).toBe(true);
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateFileSize(MAX_SIZE, MAX_SIZE)).toBe(true);
  });

  it('rejects a file exceeding the size limit', () => {
    expect(validateFileSize(MAX_SIZE + 1, MAX_SIZE)).toBe(false);
  });

  it('accepts zero-byte files', () => {
    expect(validateFileSize(0, MAX_SIZE)).toBe(true);
  });

  it('uses default 50MB max when no maxSize is provided', () => {
    expect(validateFileSize(MAX_SIZE)).toBe(true);
    expect(validateFileSize(MAX_SIZE + 1)).toBe(false);
  });
});

describe('backupDatabase', () => {
  it('creates a .backup file with the original content', async () => {
    const dbPath = path.join(tmpDir, 'backup-test.db');
    const originalContent = createSqliteBuffer(512);
    await fs.writeFile(dbPath, originalContent);

    await backupDatabase(dbPath);

    const backupContent = await fs.readFile(`${dbPath}.backup`);
    expect(Buffer.compare(backupContent, originalContent)).toBe(0);
  });

  it('does not throw when the source file does not exist', async () => {
    const dbPath = path.join(tmpDir, 'nonexistent.db');
    await expect(backupDatabase(dbPath)).resolves.toBeUndefined();
  });

  it('overwrites a previous backup', async () => {
    const dbPath = path.join(tmpDir, 'overwrite-backup.db');
    const firstContent = createSqliteBuffer(256);
    const secondContent = createSqliteBuffer(512);

    await fs.writeFile(dbPath, firstContent);
    await backupDatabase(dbPath);

    await fs.writeFile(dbPath, secondContent);
    await backupDatabase(dbPath);

    const backupContent = await fs.readFile(`${dbPath}.backup`);
    expect(Buffer.compare(backupContent, secondContent)).toBe(0);
  });
});

describe('writeDatabaseFile', () => {
  it('writes a buffer to the specified path', async () => {
    const dbPath = path.join(tmpDir, 'write-test.db');
    const content = createSqliteBuffer();

    await writeDatabaseFile(dbPath, content);

    const written = await fs.readFile(dbPath);
    expect(Buffer.compare(written, content)).toBe(0);
  });

  it('overwrites an existing file', async () => {
    const dbPath = path.join(tmpDir, 'overwrite-test.db');
    const oldContent = Buffer.from('old data');
    const newContent = createSqliteBuffer(2048);

    await fs.writeFile(dbPath, oldContent);
    await writeDatabaseFile(dbPath, newContent);

    const written = await fs.readFile(dbPath);
    expect(Buffer.compare(written, newContent)).toBe(0);
  });

  it('written file is byte-for-byte identical to the uploaded buffer', async () => {
    const dbPath = path.join(tmpDir, 'integrity-test.db');
    const content = createSqliteBuffer(8192);
    for (let i = 16; i < content.length; i++) {
      content[i] = i % 256;
    }

    await writeDatabaseFile(dbPath, content);

    const written = await fs.readFile(dbPath);
    expect(written.length).toBe(content.length);
    expect(Buffer.compare(written, content)).toBe(0);
  });
});

describe('full upload flow (backup + write)', () => {
  it('backup preserves old content and write stores new content', async () => {
    const dbPath = path.join(tmpDir, 'flow-test.db');
    const oldContent = createSqliteBuffer(1024);
    const newContent = createSqliteBuffer(2048);
    oldContent[16] = 0xaa;
    newContent[16] = 0xbb;

    await fs.writeFile(dbPath, oldContent);

    await backupDatabase(dbPath);
    await writeDatabaseFile(dbPath, newContent);

    const currentDb = await fs.readFile(dbPath);
    expect(Buffer.compare(currentDb, newContent)).toBe(0);

    const backupDb = await fs.readFile(`${dbPath}.backup`);
    expect(Buffer.compare(backupDb, oldContent)).toBe(0);
  });
});
