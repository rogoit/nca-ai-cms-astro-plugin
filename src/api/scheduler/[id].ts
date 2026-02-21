import type { APIRoute } from 'astro';
import { SchedulerService } from '../../services/SchedulerService';
import { AstroSchedulerDBAdapter } from '../../services/SchedulerDBAdapter';
import { jsonResponse, jsonError } from '../_utils';

function getService(): SchedulerService {
  return new SchedulerService(new AstroSchedulerDBAdapter());
}

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    if (!id) {
      return jsonError('id is required', 400);
    }

    const service = getService();
    await service.delete(id);

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Scheduler delete error:', error);
    const status =
      error instanceof Error && error.message.includes('not found')
        ? 404
        : error instanceof Error && error.message.includes('Cannot delete')
          ? 403
          : 500;
    return jsonError(error, status);
  }
};
