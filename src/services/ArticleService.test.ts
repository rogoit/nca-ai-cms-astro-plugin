import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArticleService, ArticleNotFoundError } from './ArticleService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ArticleService', () => {
  let tempDir: string;
  let service: ArticleService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'article-service-test-'));
    service = new ArticleService(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestArticle(
    slug: string,
    year = '2026',
    month = '01'
  ): Promise<string> {
    const folderPath = path.join(tempDir, year, month, slug);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(
      path.join(folderPath, 'index.md'),
      `---
title: "Test Article"
description: "Test description"
date: "${year}-${month}-15"
tags: ["Test"]
image: "./hero.webp"
imageAlt: "Test image"
---

# Test Article

Content here.
`
    );
    // Create a dummy image file
    await fs.writeFile(path.join(folderPath, 'hero.webp'), 'fake-image-data');
    return folderPath;
  }

  describe('delete', () => {
    it('removes article folder recursively', async () => {
      const folderPath = await createTestArticle('test-article');

      // Verify folder exists
      const existsBefore = await fs
        .access(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(existsBefore).toBe(true);

      await service.delete('test-article');

      // Verify folder no longer exists
      const existsAfter = await fs
        .access(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(existsAfter).toBe(false);
    });

    it('throws ArticleNotFoundError for invalid slug', async () => {
      await expect(service.delete('non-existent-article')).rejects.toThrow(
        ArticleNotFoundError
      );
    });

    it('removes both index.md and hero.webp', async () => {
      const folderPath = await createTestArticle('full-article');

      await service.delete('full-article');

      // Article folder should no longer exist
      const articleExists = await fs
        .access(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(articleExists).toBe(false);
    });
  });

  describe('read', () => {
    it('reads article metadata from frontmatter', async () => {
      await createTestArticle('readable-article');

      const article = await service.read('readable-article');

      expect(article).not.toBeNull();
      expect(article?.title).toBe('Test Article');
      expect(article?.description).toBe('Test description');
      expect(article?.tags).toContain('Test');
    });

    it('returns null for non-existent article', async () => {
      const article = await service.read('does-not-exist');
      expect(article).toBeNull();
    });

    it('includes article ID in result', async () => {
      await createTestArticle('id-test', '2025', '06');

      const article = await service.read('id-test');

      expect(article?.articleId).toBe('2025/06/id-test');
    });
  });

  describe('updateContent', () => {
    it('updates article content preserving frontmatter fields', async () => {
      await createTestArticle('update-test');

      await service.updateContent('update-test', {
        content: '# Updated Title\n\nNew content here.',
      });

      const article = await service.read('update-test');
      expect(article?.title).toBe('Test Article'); // Title preserved
      expect(article?.content).toContain('New content here.');
    });

    it('can update title and description', async () => {
      await createTestArticle('metadata-update');

      await service.updateContent('metadata-update', {
        title: 'New Title',
        description: 'New description',
        content: '# New Title\n\nContent.',
      });

      const article = await service.read('metadata-update');
      expect(article?.title).toBe('New Title');
      expect(article?.description).toBe('New description');
    });

    it('throws ArticleNotFoundError for invalid slug', async () => {
      await expect(
        service.updateContent('invalid', { content: 'test' })
      ).rejects.toThrow(ArticleNotFoundError);
    });
  });
});
