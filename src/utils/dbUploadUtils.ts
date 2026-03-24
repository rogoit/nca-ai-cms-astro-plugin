import * as fs from 'fs/promises';
import * as path from 'path';

const SQLITE_HEADER = 'SQLite format 3';
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export function validateSqliteHeader(buffer: Buffer): boolean {
  if (buffer.length < 16) {
    return false;
  }
  const header = buffer.subarray(0, 16).toString('utf8');
  return header.startsWith(SQLITE_HEADER);
}

export function validateFileSize(
  size: number,
  maxSize: number = DEFAULT_MAX_SIZE,
): boolean {
  return size <= maxSize;
}

export async function backupDatabase(dbPath: string): Promise<void> {
  try {
    await fs.copyFile(dbPath, `${dbPath}.backup`);
  } catch {
    // No existing DB to backup — not an error
  }
}

export async function writeDatabaseFile(
  dbPath: string,
  buffer: Buffer,
): Promise<void> {
  await fs.writeFile(dbPath, buffer);
}

export function getDbPath(): string {
  const envPath = process.env.ASTRO_DATABASE_FILE;
  if (envPath) {
    const resolved = path.resolve(process.cwd(), envPath);
    if (!resolved.startsWith(process.cwd())) {
      throw new Error('Invalid database path');
    }
    return resolved;
  }
  return path.join(process.cwd(), '.astro', 'content.db');
}

export function restartNodeProcess(): void {
  try {
    const { spawn } = require('child_process');
    const child = spawn('sh', ['-c', 'sleep 0.5 && supervisorctl -c /etc/supervisord.conf restart node'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // supervisorctl not available (e.g. dev environment)
  }
}
