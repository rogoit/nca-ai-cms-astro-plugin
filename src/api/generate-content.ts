import type { APIRoute } from 'astro';
import { ContentGenerator } from '../services/ContentGenerator';
import { PromptService } from '../services/PromptService';
import { getEnvVariable } from '../utils/envUtils';
import { jsonResponse, jsonError } from './_utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, keywords } = await request.json();

    if (!url && !keywords) {
      return jsonError('URL or keywords required', 400);
    }

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });
    const article = url
      ? await generator.generateFromUrl(url)
      : await generator.generateFromKeywords(keywords);

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
