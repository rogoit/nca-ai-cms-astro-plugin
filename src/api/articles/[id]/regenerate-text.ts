import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { ContentGenerator } from '../../../services/ContentGenerator';
import { PromptService } from '../../../services/PromptService';
import { getEnvVariable } from '../../../utils/envUtils';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../../_utils';

// POST /api/articles/[id]/regenerate-text - Generate new content for article
// Returns preview of new content WITHOUT saving
export const POST: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;

    if (!slug) {
      return jsonError('Article ID required', 400);
    }

    // Read existing article to get title for regeneration
    const service = new ArticleService(contentPath);
    const existingArticle = await service.read(slug);

    if (!existingArticle) {
      throw new ArticleNotFoundError(slug);
    }

    // Generate new content using existing title as keywords
    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });

    // Use the existing title as keywords for regeneration
    const newArticle = await generator.generateFromKeywords(
      existingArticle.title
    );

    return jsonResponse({
      title: newArticle.title,
      description: newArticle.description,
      content: newArticle.content,
      tags: newArticle.tags,
      // Include original article info for reference
      originalTitle: existingArticle.title,
      articleId: existingArticle.articleId,
    });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return jsonError(error, 404);
    }

    console.error('Regenerate text error:', error);
    return jsonError(error);
  }
};
