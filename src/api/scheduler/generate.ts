import type { APIRoute } from 'astro';
import { SchedulerService } from '../../services/SchedulerService';
import { AstroSchedulerDBAdapter } from '../../services/SchedulerDBAdapter';
import { ContentGenerator } from '../../services/ContentGenerator';
import { ImageGenerator } from '../../services/ImageGenerator';
import { PromptService } from '../../services/PromptService';
import { getEnvVariable } from '../../utils/envUtils';
import { jsonResponse, jsonError } from '../_utils';

function getService(): SchedulerService {
  return new SchedulerService(new AstroSchedulerDBAdapter());
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, mode = 'all' } = await request.json();

    if (!id) {
      return jsonError('id is required', 400);
    }

    const service = getService();
    const post = await service.getById(id);

    if (!post.canGenerate()) {
      return jsonError(
        `Cannot generate: post is in status "${post.status}"`,
        400
      );
    }

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');

    if (mode === 'text' || mode === 'all') {
      const promptService = new PromptService();
      const contentGenerator = new ContentGenerator({ apiKey, promptService });

      const article =
        post.inputType === 'url'
          ? await contentGenerator.generateFromUrl(post.input)
          : await contentGenerator.generateFromKeywords(post.input);

      if (mode === 'text') {
        await service.updateText(id, {
          title: article.title,
          description: article.description,
          content: article.content,
          tags: article.tags,
        });
      } else {
        // mode === 'all': generate image too
        let imageData: string | undefined;
        let imageAlt: string | undefined;
        try {
          const imageGenerator = new ImageGenerator({ apiKey });
          const image = await imageGenerator.generate(article.title);
          imageData = image.base64;
          imageAlt = image.alt;
        } catch (error) {
          console.warn(
            'Image generation failed, continuing without image:',
            error
          );
        }

        await service.markGenerated(id, {
          title: article.title,
          description: article.description,
          content: article.content,
          tags: article.tags,
          imageData,
          imageAlt,
        });
      }
    } else if (mode === 'image') {
      // Use existing title or fallback to input
      const title = post.generatedTitle || post.input;
      const imageGenerator = new ImageGenerator({ apiKey });
      const image = await imageGenerator.generate(title);

      await service.updateImage(id, {
        imageData: image.base64 || '',
        imageAlt: image.alt,
      });
    }

    const updated = await service.getById(id);

    return jsonResponse({ post: updated });
  } catch (error) {
    console.error('Scheduler generate error:', error);
    return jsonError(error);
  }
};
