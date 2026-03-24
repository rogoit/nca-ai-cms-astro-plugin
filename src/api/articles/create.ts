import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ContentGenerator } from '../../services/ContentGenerator';
import { ImageGenerator } from '../../services/ImageGenerator';
import { PromptService } from '../../services/PromptService';
import { ArticleService } from '../../services/ArticleService';
import { Article } from '../../domain/entities/Article';
import { FileWriter } from '../../services/FileWriter';
import { convertToWebP } from '../../services/ImageConverter';
import { getEnvVariable } from '../../utils/envUtils';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from '../_utils';

const CreateArticleSchema = z.object({
  input: z.string().min(1, 'Thema ist erforderlich'),
  notes: z.string().optional(),
});

// POST /api/articles/create - Generate content + image and save in one call
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON', 400);
    }

    const parsed = CreateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'Invalid request', 400);
    }

    const { input, notes } = parsed.data;
    const isUrl = /^https?:\/\//.test(input);

    // Build combined input with notes if provided
    const combinedInput = notes ? `${input}\n\nHinweise: ${notes}` : input;

    const apiKey = getEnvVariable('GOOGLE_GEMINI_API_KEY');
    const promptService = new PromptService();
    const generator = new ContentGenerator({ apiKey, promptService });

    // Generate content
    const article = isUrl
      ? await generator.generateFromUrl(combinedInput)
      : await generator.generateFromKeywords(combinedInput);

    // Create article entity with image reference
    const articleEntity = new Article({
      title: article.title,
      description: article.description,
      content: article.content,
      date: new Date(),
      tags: article.tags,
      image: './hero.webp',
      contentPath,
    });

    // Save markdown file
    const writer = new FileWriter();
    await writer.write(articleEntity);

    // Generate and save hero image
    try {
      const imageGenerator = new ImageGenerator({ apiKey });
      const image = await imageGenerator.generate(article.title);

      if (image.base64) {
        const heroPath = `${articleEntity.folderPath}/hero.webp`;
        await convertToWebP(image.base64, heroPath);

        // Update frontmatter with imageAlt
        const service = new ArticleService(contentPath);
        await service.updateContent(articleEntity.slug.toString(), {
          imageAlt: image.alt,
        });
      }
    } catch (imageError) {
      console.error('Image generation failed (article saved without image):', imageError);
    }

    // Build the slug path for redirect
    const slugPath = `${articleEntity.year}/${articleEntity.month}/${articleEntity.slug.toString()}`;

    return jsonResponse({
      success: true,
      slug: slugPath,
      articleId: articleEntity.slug.toString(),
      title: article.title,
    });
  } catch (error) {
    console.error('Create article error:', error);
    return jsonError(error);
  }
};
