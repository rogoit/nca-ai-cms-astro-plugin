import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ContentGenerator } from '../services/ContentGenerator';
import { PromptService } from '../services/PromptService';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

const GenerateContentSchema = z.object({
  url: z.string().url().optional(),
  keywords: z.string().min(1).optional(),
}).refine((data) => data.url || data.keywords, {
  message: 'URL or keywords required',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = GenerateContentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }
    const { url, keywords } = parsed.data;

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });
    const article = url
      ? await generator.generateFromUrl(url)
      : await generator.generateFromKeywords(keywords!);

    return jsonResponse({
      title: article.title,
      description: article.description,
      content: article.content,
      filepath: article.filepath,
      tags: article.tags,
      date: article.date.toISOString(),
    });
  } catch (error) {
    console.error('Generation error:', error);
    return jsonError(error);
  }
};
