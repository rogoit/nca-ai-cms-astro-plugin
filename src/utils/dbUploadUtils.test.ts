import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
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

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-upload-test-'));
});

after(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('validateSqliteHeader', () => {
  it('returns true for a valid SQLite buffer', () => {
    const buf = createSqliteBuffer();
    assert.equal(validateSqliteHeader(buf), true);
  });

  it('rejects a buffer that does not start with "SQLite format 3"', () => {
    const buf = Buffer.from('not a sqlite file at all');
    assert.equal(validateSqliteHeader(buf), false);
  });

  it('rejects an empty buffer', () => {
    const buf = Buffer.alloc(0);
    assert.equal(validateSqliteHeader(buf), false);
  });

  it('rejects a buffer shorter than 16 bytes', () => {
    const buf = Buffer.from('SQLite');
    assert.equal(validateSqliteHeader(buf), false);
  });

  it('rejects a buffer with similar but incorrect header', () => {
    const buf = Buffer.alloc(4096);
    Buffer.from('SQLite format 2\0').copy(buf);
    assert.equal(validateSqliteHeader(buf), false);
  });

  it('accepts a minimal 16-byte valid header', () => {
    const buf = Buffer.from('SQLite format 3\0');
    assert.equal(validateSqliteHeader(buf), true);
  });
});

describe('validateFileSize', () => {
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  it('accepts a file within the size limit', () => {
    assert.equal(validateFileSize(1024, MAX_SIZE), true);
  });

  it('accepts a file exactly at the size limit', () => {
    assert.equal(validateFileSize(MAX_SIZE, MAX_SIZE), true);
  });

  it('rejects a file exceeding the size limit', () => {
    assert.equal(validateFileSize(MAX_SIZE + 1, MAX_SIZE), false);
  });

  it('accepts zero-byte files', () => {
    assert.equal(validateFileSize(0, MAX_SIZE), true);
  });

  it('uses default 50MB max when no maxSize is provided', () => {
    assert.equal(validateFileSize(MAX_SIZE), true);
    assert.equal(validateFileSize(MAX_SIZE + 1), false);
  });
});

describe('backupDatabase', () => {
  it('creates a .backup file with the original content', async () => {
    const dbPath = path.join(tmpDir, 'backup-test.db');
    const originalContent = createSqliteBuffer(512);
    await fs.writeFile(dbPath, originalContent);

    await backupDatabase(dbPath);

    const backupContent = await fs.readFile(`${dbPath}.backup`);
    assert.deepEqual(backupContent, originalContent);
  });

  it('does not throw when the source file does not exist', async () => {
    const dbPath = path.join(tmpDir, 'nonexistent.db');
    await assert.doesNotReject(() => backupDatabase(dbPath));
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
    assert.deepEqual(backupContent, secondContent);
  });
});

describe('writeDatabaseFile', () => {
  it('writes a buffer to the specified path', async () => {
    const dbPath = path.join(tmpDir, 'write-test.db');
    const content = createSqliteBuffer();

    await writeDatabaseFile(dbPath, content);

    const written = await fs.readFile(dbPath);
    assert.deepEqual(written, content);
  });

  it('overwrites an existing file', async () => {
    const dbPath = path.join(tmpDir, 'overwrite-test.db');
    const oldContent = Buffer.from('old data');
    const newContent = createSqliteBuffer(2048);

    await fs.writeFile(dbPath, oldContent);
    await writeDatabaseFile(dbPath, newContent);

    const written = await fs.readFile(dbPath);
    assert.deepEqual(written, newContent);
    assert.notDeepEqual(written, oldContent);
  });

  it('written file is byte-for-byte identical to the uploaded buffer', async () => {
    const dbPath = path.join(tmpDir, 'integrity-test.db');
    const content = createSqliteBuffer(8192);
    for (let i = 16; i < content.length; i++) {
      content[i] = i % 256;
    }

    await writeDatabaseFile(dbPath, content);

    const written = await fs.readFile(dbPath);
    assert.equal(written.length, content.length);
    assert.equal(Buffer.compare(written, content), 0);
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
    assert.deepEqual(currentDb, newContent);

    const backupDb = await fs.readFile(`${dbPath}.backup`);
    assert.deepEqual(backupDb, oldContent);
  });
});
