import type { APIRoute } from 'astro';
import path from 'node:path';
import { z } from 'zod';
import { convertToWebP } from '../services/ImageConverter';
import { jsonResponse, jsonError } from './_utils';

const SaveImageSchema = z.object({
  url: z.string().regex(/^data:image\/\w+;base64,.+$/, 'Invalid image data URL'),
  folderPath: z.string().min(1, 'folderPath is required'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = SaveImageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const { url, folderPath } = parsed.data;

    // Regex is guaranteed to match since Zod already validated the format
    const base64Data = url.split(',')[1]!;

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
