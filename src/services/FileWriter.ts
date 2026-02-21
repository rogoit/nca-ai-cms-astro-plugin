import { Article } from '../domain/entities/Article';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WriteResult {
  filepath: string;
  created: boolean;
}

export class FileWriter {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  async write(article: Article): Promise<WriteResult> {
    const filepath = path.join(this.basePath, article.filepath);
    const dir = path.dirname(filepath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Check if file already exists
    const exists = await this.fileExists(filepath);
    if (exists) {
      const newPath = await this.getUniqueFilepath(filepath);
      await fs.writeFile(newPath, article.toMarkdown(), 'utf-8');
      return { filepath: newPath, created: true };
    }

    await fs.writeFile(filepath, article.toMarkdown(), 'utf-8');
    return { filepath, created: true };
  }

  private async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  private async getUniqueFilepath(filepath: string): Promise<string> {
    const ext = path.extname(filepath);
    const base = filepath.slice(0, -ext.length);

    let counter = 2;
    let newPath = `${base}-${counter}${ext}`;

    while (await this.fileExists(newPath)) {
      counter++;
      newPath = `${base}-${counter}${ext}`;
    }

    return newPath;
  }
}
