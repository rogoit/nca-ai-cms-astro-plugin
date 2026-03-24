import type { APIRoute } from 'astro';
import { jsonError } from '../_utils';

/**
 * @deprecated Use POST /api/db/import with JSON payload instead.
 * Export via GET /api/db/export, import via POST /api/db/import.
 */
export const POST: APIRoute = async () => {
  return jsonError(
    'SQLite file upload is no longer supported. Use POST /api/db/import with JSON payload (exported via GET /api/db/export).',
    410,
  );
};
