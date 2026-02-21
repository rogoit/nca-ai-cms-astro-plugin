import type { APIRoute } from 'astro';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import {
  ArticleService,
  ArticleNotFoundError,
} from '../../../services/ArticleService';
import { convertToWebP } from '../../../services/ImageConverter';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../../_utils';

interface ApplyRequest {
  // For text updates
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  // For image updates
  imageUrl?: string;
  imageAlt?: string;
}

// POST /api/articles/[id]/apply - Save regenerated content or image
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const slug = params.id;

    if (!slug) {
      return jsonError('Article ID required', 400);
    }

    const data: ApplyRequest = await request.json();
    const service = new ArticleService(contentPath);

    // Read existing article
    const existingArticle = await service.read(slug);
    if (!existingArticle) {
      throw new ArticleNotFoundError(slug);
    }

    // Handle image update if imageUrl is provided
    if (data.imageUrl) {
      const heroPath = path.join(existingArticle.folderPath, 'hero.webp');

      console.log('Saving image to:', heroPath);
      console.log('Image URL length:', data.imageUrl.length);

      // Decode base64 image data and convert to WebP
      const base64Data = data.imageUrl.replace(/^data:image\/\w+;base64,/, '');

      await convertToWebP(base64Data, heroPath);
      console.log('Image saved successfully');

      // Update imageAlt if provided
      if (data.imageAlt) {
        const indexPath = path.join(existingArticle.folderPath, 'index.md');
        const fileContent = await fs.readFile(indexPath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);

        frontmatter.imageAlt = data.imageAlt;

        const updatedContent = matter.stringify(content, frontmatter);
        await fs.writeFile(indexPath, updatedContent);
      }
    }

    // Handle text update if content is provided
    if (data.content || data.title || data.description) {
      await service.updateContent(slug, {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.content && { content: data.content }),
      });
    }

    return jsonResponse({
      success: true,
      articleId: existingArticle.articleId,
    });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return jsonError(error, 404);
    }

    console.error('Apply changes error:', error);
    return jsonError(error);
  }
};
