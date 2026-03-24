import type { APIRoute } from 'astro';
import { jsonResponse, jsonError } from '../_utils';
import { DbTransferService, validateImportPayload } from '../../services/DbTransferService.js';

const MAX_IMPORT_SIZE = 50 * 1024 * 1024; // 50 MB

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonError('Invalid content type. Use application/json.', 400);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_IMPORT_SIZE) {
      return jsonError('Payload too large. Maximum 50 MB.', 413);
    }

    const text = await request.text();
    if (text.length > MAX_IMPORT_SIZE) {
      return jsonError('Payload too large. Maximum 50 MB.', 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return jsonError('Invalid JSON.', 400);
    }

    const validation = validateImportPayload(payload);
    if (!validation.valid) {
      return jsonError(`Validation failed: ${validation.errors.join('; ')}`, 400);
    }

    const service = new DbTransferService();
    const result = await service.importAll(payload as any);

    return jsonResponse({
      success: true,
      imported: result.imported,
    });
  } catch {
    return jsonError('Database import failed', 500);
  }
};
