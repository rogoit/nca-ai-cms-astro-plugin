import type { APIRoute } from 'astro';
import { Article } from '../domain/entities/Article';
import { FileWriter } from '../services/FileWriter';
import { contentPath } from 'virtual:nca-ai-cms/config';
import { jsonResponse, jsonError } from './_utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const article = new Article({
      title: data.title,
      description: data.description,
      content: data.content,
      date: new Date(data.date || Date.now()),
      tags: data.tags || [],
      image: './hero.webp',
      imageAlt: data.imageAlt,
      contentPath,
    });

    const writer = new FileWriter();
    const result = await writer.write(article);

    return jsonResponse({
      success: true,
      filepath: result.filepath,
      folderPath: article.folderPath,
    });
  } catch (error) {
    console.error('Save error:', error);
    return jsonError(error);
  }
};
