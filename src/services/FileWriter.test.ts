import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWriter } from './FileWriter';
import { Article } from '../domain/entities/Article';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FileWriter', () => {
  let tempDir: string;
  let fileWriter: FileWriter;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filewriter-test-'));
    fileWriter = new FileWriter(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createTestArticle = (overrides = {}) =>
    new Article({
      title: 'Test Article',
      description: 'Test description',
      content: '# Test\n\nContent here',
      date: new Date('2025-12-07'),
      tags: ['test'],
      ...overrides,
    });

  it('creates article folder with index.md', async () => {
    const article = createTestArticle();
    const result = await fileWriter.write(article);

    expect(result.created).toBe(true);
    expect(result.filepath).toContain('/index.md');

    const content = await fs.readFile(result.filepath, 'utf-8');
    expect(content).toContain('title: "Test Article"');
  });

  it('creates nested year/month/slug folder structure', async () => {
    const article = createTestArticle();
    await fileWriter.write(article);

    const expectedFolder = path.join(
      tempDir,
      'nca-ai-cms-content/2025/12/test-article'
    );
    const stats = await fs.stat(expectedFolder);
    expect(stats.isDirectory()).toBe(true);

    const indexPath = path.join(expectedFolder, 'index.md');
    const indexStats = await fs.stat(indexPath);
    expect(indexStats.isFile()).toBe(true);
  });

  it('includes image path in frontmatter when provided', async () => {
    const article = createTestArticle({
      image: './hero.webp',
      imageAlt: 'Test image alt',
    });

    const result = await fileWriter.write(article);
    const content = await fs.readFile(result.filepath, 'utf-8');

    expect(content).toContain('image: "./hero.webp"');
    expect(content).toContain('imageAlt: "Test image alt"');
  });

  it('handles duplicate articles by appending counter', async () => {
    const article = createTestArticle();

    const result1 = await fileWriter.write(article);
    const result2 = await fileWriter.write(article);

    expect(result1.filepath).toContain('/index.md');
    expect(result2.filepath).toContain('/index-2.md');
  });
});
