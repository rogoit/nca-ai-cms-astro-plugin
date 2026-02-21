import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { ImageGenerator } from '../../../services/ImageGenerator';
import { getEnvVariable } from '../../../utils/envUtils';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../../_utils';

// POST /api/articles/[id]/regenerate-image - Generate new image for article
// Returns preview of new image URL WITHOUT saving
export const POST: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;

    if (!slug) {
      return jsonError('Article ID required', 400);
    }

    // Read existing article to get title for image generation
    const service = new ArticleService(contentPath);
    const existingArticle = await service.read(slug);

    if (!existingArticle) {
      throw new ArticleNotFoundError(slug);
    }

    // Generate new image using article title
    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const generator = new ImageGenerator({ apiKey });
    const image = await generator.generate(existingArticle.title);

    return jsonResponse({
      url: image.url,
      alt: image.alt,
      // Include article info for reference
      articleId: existingArticle.articleId,
      articleTitle: existingArticle.title,
    });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return jsonError(error, 404);
    }

    console.error('Regenerate image error:', error);
    return jsonError(error);
  }
};
