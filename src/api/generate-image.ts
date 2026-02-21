import type { APIRoute } from 'astro';
import { ImageGenerator } from '../services/ImageGenerator';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { title } = await request.json();

    if (!title) {
      return jsonError('Title is required', 400);
    }

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const generator = new ImageGenerator({ apiKey });
    const image = await generator.generate(title);

    return jsonResponse({
      url: image.url,
      alt: image.alt,
      filepath: image.filepath,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return jsonError(error);
  }
};
