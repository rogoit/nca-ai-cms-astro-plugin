import type { APIRoute } from 'astro';
import { jsonResponse, jsonError } from '../_utils';
import {
  validateSqliteHeader,
  validateFileSize,
  backupDatabase,
  writeDatabaseFile,
  getDbPath,
  restartNodeProcess,
} from '../../utils/dbUploadUtils.js';

const MAX_DB_SIZE = 50 * 1024 * 1024; // 50 MB

export const POST: APIRoute = async ({ request }) => {
  try {
    const dbPath = getDbPath();
    const contentType = request.headers.get('content-type') || '';

    let dbBuffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('database') as File | null;

      if (!file) {
        return jsonError('No database file provided. Use field name "database".', 400);
      }

      if (!validateFileSize(file.size, MAX_DB_SIZE)) {
        return jsonError('File too large. Maximum 50 MB.', 413);
      }

      const arrayBuffer = await file.arrayBuffer();
      dbBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/octet-stream')) {
      const arrayBuffer = await request.arrayBuffer();
      dbBuffer = Buffer.from(arrayBuffer);

      if (!validateFileSize(dbBuffer.length, MAX_DB_SIZE)) {
        return jsonError('File too large. Maximum 50 MB.', 413);
      }
    } else {
      return jsonError('Invalid content type. Use multipart/form-data or application/octet-stream.', 400);
    }

    if (!validateSqliteHeader(dbBuffer)) {
      return jsonError('Invalid file: not a SQLite database.', 400);
    }

    await backupDatabase(dbPath);
    await writeDatabaseFile(dbPath, dbBuffer);

    // Restart Node process so the new DB is loaded fresh
    restartNodeProcess();

    return jsonResponse({
      success: true,
      size: dbBuffer.length,
      message: 'Database uploaded. Server restarting...',
      deprecated: 'Use POST /api/db/import with JSON payload instead. The SQLite file upload causes connection issues and will be removed in a future version.',
    });
  } catch {
    return jsonError('Database upload failed', 500);
  }
};
