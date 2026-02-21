import type { APIRoute } from 'astro';
import { z } from 'zod';
import { SchedulerService } from '../services/SchedulerService';
import { AstroSchedulerDBAdapter } from '../services/SchedulerDBAdapter';
import { jsonResponse, jsonError } from './_utils';

const CreateScheduledPostSchema = z.object({
  input: z.string().min(1, 'input is required'),
  scheduledDate: z.string().min(1, 'scheduledDate is required'),
});

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
    const body = await request.json();
    const parsed = CreateScheduledPostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const data = parsed.data;

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
