import type { APIRoute } from 'astro';
import { jsonError } from '../_utils';
import { DbTransferService } from '../../services/DbTransferService.js';

export const GET: APIRoute = async () => {
  try {
    const service = new DbTransferService();
    const payload = await service.exportAll();
    const json = JSON.stringify(payload, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="content-${timestamp}.json"`,
        'Content-Length': String(Buffer.byteLength(json)),
      },
    });
  } catch {
    return jsonError('Database export failed', 500);
  }
};
