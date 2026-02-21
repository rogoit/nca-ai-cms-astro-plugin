import {
  ScheduledPost,
  type ScheduledPostDBRow,
  type ScheduledPostStatus,
} from '../domain/entities/ScheduledPost';

export interface SchedulerDBAdapter {
  listAll(): Promise<ScheduledPostDBRow[]>;
  getById(id: string): Promise<ScheduledPostDBRow | null>;
  insert(row: ScheduledPostDBRow): Promise<void>;
  update(id: string, data: Partial<ScheduledPostDBRow>): Promise<void>;
  deleteById(id: string): Promise<void>;
  getByDate(date: Date): Promise<ScheduledPostDBRow | null>;
}

export interface CreateScheduledPostInput {
  input: string;
  scheduledDate: Date;
}

export class SchedulerService {
  constructor(private readonly db: SchedulerDBAdapter) {}

  private async requireGeneratable(id: string, action: string): Promise<void> {
    const post = await this.getById(id);
    if (!post.canGenerate()) {
      throw new Error(`Cannot ${action}: post is in status "${post.status}"`);
    }
  }

  async create(data: CreateScheduledPostInput): Promise<ScheduledPost> {
    // Check for duplicate date
    const existing = await this.db.getByDate(data.scheduledDate);
    if (existing) {
      const dateStr = data.scheduledDate.toISOString().split('T')[0];
      throw new Error(`Date ${dateStr} is already scheduled for another post`);
    }

    const inputType = ScheduledPost.detectInputType(data.input);
    const post = ScheduledPost.create({
      input: data.input,
      inputType,
      scheduledDate: data.scheduledDate,
    });

    await this.db.insert({
      id: post.id,
      input: post.input,
      inputType: post.inputType,
      scheduledDate: post.scheduledDate,
      status: post.status,
      createdAt: post.createdAt,
    });

    return post;
  }

  async list(): Promise<ScheduledPost[]> {
    const rows = await this.db.listAll();
    return rows
      .map((row) => ScheduledPost.fromDB(row))
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async getById(id: string): Promise<ScheduledPost> {
    const row = await this.db.getById(id);
    if (!row) {
      throw new Error(`Scheduled post not found: ${id}`);
    }
    return ScheduledPost.fromDB(row);
  }

  async delete(id: string): Promise<void> {
    const post = await this.getById(id);
    if (!post.canDelete()) {
      throw new Error('Cannot delete a published post');
    }
    await this.db.deleteById(id);
  }

  async markGenerated(
    id: string,
    data: {
      title: string;
      description: string;
      content: string;
      tags: string[];
      imageData?: string | undefined;
      imageAlt?: string | undefined;
    }
  ): Promise<void> {
    await this.requireGeneratable(id, 'generate');

    await this.db.update(id, {
      status: 'generated' as ScheduledPostStatus,
      generatedTitle: data.title,
      generatedDescription: data.description,
      generatedContent: data.content,
      generatedTags: JSON.stringify(data.tags),
      generatedImageData: data.imageData || null,
      generatedImageAlt: data.imageAlt || null,
    });
  }

  async updateText(
    id: string,
    data: {
      title: string;
      description: string;
      content: string;
      tags: string[];
    }
  ): Promise<void> {
    await this.requireGeneratable(id, 'regenerate');

    await this.db.update(id, {
      status: 'generated' as ScheduledPostStatus,
      generatedTitle: data.title,
      generatedDescription: data.description,
      generatedContent: data.content,
      generatedTags: JSON.stringify(data.tags),
    });
  }

  async updateImage(
    id: string,
    data: { imageData: string; imageAlt: string }
  ): Promise<void> {
    await this.requireGeneratable(id, 'regenerate');

    await this.db.update(id, {
      status: 'generated' as ScheduledPostStatus,
      generatedImageData: data.imageData,
      generatedImageAlt: data.imageAlt,
    });
  }

  async markPublished(id: string, publishedPath: string): Promise<void> {
    await this.db.update(id, {
      status: 'published' as ScheduledPostStatus,
      publishedPath,
    });
  }

  async getDuePosts(): Promise<ScheduledPost[]> {
    const all = await this.list();
    return all.filter((post) => post.isDue());
  }
}
