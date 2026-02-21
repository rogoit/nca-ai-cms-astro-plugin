import type { APIRoute } from 'astro';
import { SchedulerService } from '../services/SchedulerService';
import { AstroSchedulerDBAdapter } from '../services/SchedulerDBAdapter';
import { jsonResponse, jsonError } from './_utils';

function getService(): SchedulerService {
  return new SchedulerService(new AstroSchedulerDBAdapter());
}

export const GET: APIRoute = async () => {
  try {
    const service = getService();
    const posts = await service.list();
    return jsonResponse({ posts });
  } catch (error) {
    console.error('Scheduler list error:', error);
    return jsonError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    if (!data.input || !data.scheduledDate) {
      return jsonError('input and scheduledDate are required', 400);
    }

    const service = getService();
    const post = await service.create({
      input: data.input,
      scheduledDate: new Date(data.scheduledDate),
    });

    return jsonResponse({ post }, 201);
  } catch (error) {
    console.error('Scheduler create error:', error);
    const status =
      error instanceof Error && error.message.includes('already scheduled')
        ? 409
        : 500;
    return jsonError(error, status);
  }
};
