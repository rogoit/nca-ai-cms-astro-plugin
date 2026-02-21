import type { APIRoute } from 'astro';
import { PromptService } from '../services/PromptService';
import { jsonResponse, jsonError } from './_utils';

const service = new PromptService();

// GET /api/prompts - Get all prompts and settings
export const GET: APIRoute = async () => {
  try {
    const [prompts, settings] = await Promise.all([
      service.getAllPrompts(),
      service.getAllSettings(),
    ]);

    return jsonResponse({
      prompts,
      settings,
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    return jsonError(error);
  }
};

// POST /api/prompts - Update a prompt or setting
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    if (data.type === 'prompt' && data.id && data.promptText !== undefined) {
      await service.updatePrompt(data.id, data.promptText);
      return jsonResponse({ success: true, type: 'prompt', id: data.id });
    }

    if (data.type === 'setting' && data.key && data.value !== undefined) {
      await service.updateSetting(data.key, data.value);
      return jsonResponse({ success: true, type: 'setting', key: data.key });
    }

    return jsonError('Invalid request: missing type, id/key, or value', 400);
  } catch (error) {
    console.error('Update prompt error:', error);
    return jsonError(error);
  }
};
