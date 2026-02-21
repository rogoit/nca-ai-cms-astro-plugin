import { SchedulerService } from './SchedulerService';
import { AstroSchedulerDBAdapter } from './SchedulerDBAdapter';
import { Article } from '../domain/entities/Article';
import { FileWriter } from './FileWriter';
import { convertToWebP } from './ImageConverter';
import * as path from 'path';

const INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function publishDuePosts(
  contentPath: string = 'nca-ai-cms-content'
): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const service = new SchedulerService(new AstroSchedulerDBAdapter());
    const duePosts = await service.getDuePosts();

    if (duePosts.length === 0) return;

    console.log(`[AutoPublisher] Found ${duePosts.length} due post(s)`);

    let published = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        if (!post.generatedTitle || !post.generatedContent) {
          console.warn(
            `[AutoPublisher] Skipping ${post.id}: missing generated content`
          );
          failed++;
          continue;
        }

        const articleProps = {
          title: post.generatedTitle,
          description: post.generatedDescription || '',
          content: post.generatedContent,
          date: post.scheduledDate,
          tags: post.parsedTags,
          image: './hero.webp',
          contentPath,
          ...(post.generatedImageAlt
            ? { imageAlt: post.generatedImageAlt }
            : {}),
        };
        const article = new Article(articleProps);

        const writer = new FileWriter();
        await writer.write(article);

        if (post.generatedImageData) {
          const imagePath = path.join(
            process.cwd(),
            article.folderPath,
            'hero.webp'
          );
          await convertToWebP(post.generatedImageData, imagePath);
        }

        await service.markPublished(post.id, article.folderPath);
        published++;
        console.log(
          `[AutoPublisher] Published ${post.id} -> ${article.folderPath}`
        );
      } catch (error) {
        failed++;
        console.error(
          `[AutoPublisher] Failed to publish ${post.id}:`,
          error
        );
      }
    }

    console.log(
      `[AutoPublisher] Done: ${published} published, ${failed} failed`
    );
  } catch (error) {
    console.error('[AutoPublisher] Error checking due posts:', error);
  } finally {
    isRunning = false;
  }
}

let configuredContentPath = 'nca-ai-cms-content';

export function startAutoPublisher(
  contentPath: string = 'nca-ai-cms-content'
): void {
  if (intervalId) return;

  configuredContentPath = contentPath;

  console.log(
    `[AutoPublisher] Starting (interval: ${INTERVAL_MS / 1000 / 60} minutes)`
  );

  // Run once on startup after a short delay to let the DB initialize
  setTimeout(() => {
    publishDuePosts(configuredContentPath);
  }, 10_000);

  intervalId = setInterval(
    () => publishDuePosts(configuredContentPath),
    INTERVAL_MS
  );
}

export function stopAutoPublisher(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[AutoPublisher] Stopped');
  }
}
