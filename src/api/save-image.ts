import type { APIRoute } from 'astro';
import path from 'node:path';
import { convertToWebP } from '../services/ImageConverter';
import { jsonResponse, jsonError } from './_utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, folderPath } = await request.json();

    if (!url || !folderPath) {
      return jsonError('URL and folderPath are required', 400);
    }

    // Extract base64 data from data URL
    const base64Match = url.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      return jsonError('Invalid image data URL', 400);
    }

    const base64Data = base64Match[1];

    // Save hero.webp in the article folder
    const filepath = path.join(folderPath, 'hero.webp');
    const fullPath = path.resolve(process.cwd(), filepath);

    await convertToWebP(base64Data, fullPath);

    return jsonResponse({
      success: true,
      filepath: filepath,
    });
  } catch (error) {
    console.error('Image save error:', error);
    return jsonError(error);
  }
};
