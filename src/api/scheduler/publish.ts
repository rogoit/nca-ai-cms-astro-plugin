import type { APIRoute } from 'astro';
import { SchedulerService } from '../../services/SchedulerService';
import { AstroSchedulerDBAdapter } from '../../services/SchedulerDBAdapter';
import { Article } from '../../domain/entities/Article';
import { FileWriter } from '../../services/FileWriter';
import * as path from 'path';
import { convertToWebP } from '../../services/ImageConverter';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../_utils';

function getService(): SchedulerService {
  return new SchedulerService(new AstroSchedulerDBAdapter());
}

async function publishPost(
  service: SchedulerService,
  postId: string
): Promise<{ id: string; publishedPath: string }> {
  const post = await service.getById(postId);

  if (!post.canPublish()) {
    throw new Error(`Cannot publish: post is in status "${post.status}"`);
  }

  if (!post.generatedTitle || !post.generatedContent) {
    throw new Error('Cannot publish: missing generated content');
  }

  // Create article with the scheduled date (not today)
  const articleProps = {
    title: post.generatedTitle,
    description: post.generatedDescription || '',
    content: post.generatedContent,
    date: post.scheduledDate,
    tags: post.parsedTags,
    image: './hero.webp',
    ...(post.generatedImageAlt ? { imageAlt: post.generatedImageAlt } : {}),
    contentPath,
  };
  const article = new Article(articleProps);

  // Write article to filesystem
  const writer = new FileWriter();
  await writer.write(article);

  // Write image if available
  if (post.generatedImageData) {
    const imagePath = path.join(process.cwd(), article.folderPath, 'hero.webp');
    await convertToWebP(post.generatedImageData, imagePath);
  }

  // Mark as published in DB
  await service.markPublished(post.id, article.folderPath);

  return { id: post.id, publishedPath: article.folderPath };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const service = getService();

    // Auto-publish all due posts
    if (data.mode === 'auto') {
      const duePosts = await service.getDuePosts();
      const results: { id: string; publishedPath: string }[] = [];
      const failed: { id: string; error: string }[] = [];

      for (const post of duePosts) {
        try {
          const result = await publishPost(service, post.id);
          results.push(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Failed to auto-publish ${post.id}:`, error);
          failed.push({ id: post.id, error: message });
        }
      }

      return jsonResponse({ published: results, failed });
    }

    // Publish single post
    if (!data.id) {
      return jsonError('id or mode:"auto" is required', 400);
    }

    const result = await publishPost(service, data.id);

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    console.error('Scheduler publish error:', error);
    return jsonError(error);
  }
};
