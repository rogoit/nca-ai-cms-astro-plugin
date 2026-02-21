import type { APIRoute } from 'astro';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../services/ArticleService';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../_utils';

// GET /api/articles/[id] - Get article details
export const GET: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;

    if (!slug) {
      return jsonError('Article ID required', 400);
    }

    const service = new ArticleService(contentPath);
    const article = await service.read(slug);

    if (!article) {
      return jsonError('Article not found', 404);
    }

    return jsonResponse(article);
  } catch (error) {
    console.error('Read error:', error);
    return jsonError(error);
  }
};

// DELETE /api/articles/[id] - Delete an article by slug
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const slug = params.id;

    if (!slug) {
      return jsonError('Article ID required', 400);
    }

    const service = new ArticleService(contentPath);
    await service.delete(slug);

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return jsonError(error, 404);
    }

    console.error('Delete error:', error);
    return jsonError(error);
  }
};
