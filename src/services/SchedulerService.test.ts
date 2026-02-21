import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulerService } from './SchedulerService';
import type { ScheduledPostDBRow } from '../domain/entities/ScheduledPost';

// Mock DB adapter interface
interface MockDB {
  listAll(): Promise<ScheduledPostDBRow[]>;
  getById(id: string): Promise<ScheduledPostDBRow | null>;
  insert(row: ScheduledPostDBRow): Promise<void>;
  update(id: string, data: Partial<ScheduledPostDBRow>): Promise<void>;
  deleteById(id: string): Promise<void>;
  getByDate(date: Date): Promise<ScheduledPostDBRow | null>;
}

function createMockDB(rows: ScheduledPostDBRow[] = []): MockDB {
  const store = new Map<string, ScheduledPostDBRow>();
  rows.forEach((r) => store.set(r.id, r));

  return {
    listAll: vi.fn(async () => [...store.values()]),
    getById: vi.fn(async (id: string) => store.get(id) || null),
    insert: vi.fn(async (row: ScheduledPostDBRow) => {
      store.set(row.id, row);
    }),
    update: vi.fn(async (id: string, data: Partial<ScheduledPostDBRow>) => {
      const existing = store.get(id);
      if (existing) store.set(id, { ...existing, ...data });
    }),
    deleteById: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    getByDate: vi.fn(async (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      for (const row of store.values()) {
        const rowDate = new Date(row.scheduledDate).toISOString().split('T')[0];
        if (rowDate === dateStr && row.status !== 'published') return row;
      }
      return null;
    }),
  };
}

describe('SchedulerService', () => {
  let db: MockDB;
  let service: SchedulerService;

  beforeEach(() => {
    db = createMockDB();
    service = new SchedulerService(db);
  });

  describe('create', () => {
    it('creates a new scheduled post', async () => {
      const result = await service.create({
        input: 'ARIA Landmarks',
        scheduledDate: new Date('2026-04-01'),
      });

      expect(result.id).toMatch(/^sp_/);
      expect(result.status).toBe('pending');
      expect(result.inputType).toBe('keywords');
      expect(db.insert).toHaveBeenCalled();
    });

    it('detects URL input type', async () => {
      const result = await service.create({
        input: 'https://example.com/article',
        scheduledDate: new Date('2026-04-01'),
      });

      expect(result.inputType).toBe('url');
    });

    it('rejects duplicate dates', async () => {
      const date = new Date('2026-04-01');
      db = createMockDB([
        {
          id: 'sp_existing',
          input: 'existing',
          inputType: 'keywords',
          scheduledDate: date,
          status: 'pending',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await expect(
        service.create({ input: 'new entry', scheduledDate: date })
      ).rejects.toThrow('already scheduled');
    });
  });

  describe('list', () => {
    it('returns all posts sorted by date', async () => {
      const rows: ScheduledPostDBRow[] = [
        {
          id: 'sp_2',
          input: 'b',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-02'),
          status: 'pending',
          createdAt: new Date(),
        },
        {
          id: 'sp_1',
          input: 'a',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'pending',
          createdAt: new Date(),
        },
      ];
      db = createMockDB(rows);
      service = new SchedulerService(db);

      const result = await service.list();
      expect(result).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('deletes a non-published post', async () => {
      db = createMockDB([
        {
          id: 'sp_1',
          input: 'test',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'pending',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await service.delete('sp_1');
      expect(db.deleteById).toHaveBeenCalledWith('sp_1');
    });

    it('refuses to delete a published post', async () => {
      db = createMockDB([
        {
          id: 'sp_1',
          input: 'test',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'published',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await expect(service.delete('sp_1')).rejects.toThrow('Cannot delete');
    });

    it('throws if post not found', async () => {
      await expect(service.delete('sp_nonexistent')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('getDuePosts', () => {
    it('returns generated posts whose date has passed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      db = createMockDB([
        {
          id: 'sp_due',
          input: 'due',
          inputType: 'keywords',
          scheduledDate: yesterday,
          status: 'generated',
          generatedTitle: 'Title',
          generatedContent: '# Content',
          createdAt: new Date(),
        },
        {
          id: 'sp_future',
          input: 'future',
          inputType: 'keywords',
          scheduledDate: tomorrow,
          status: 'generated',
          createdAt: new Date(),
        },
        {
          id: 'sp_pending',
          input: 'pending',
          inputType: 'keywords',
          scheduledDate: yesterday,
          status: 'pending',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      const due = await service.getDuePosts();
      expect(due).toHaveLength(1);
      expect(due[0]!.id).toBe('sp_due');
    });
  });

  describe('markGenerated', () => {
    it('updates post with generated content', async () => {
      db = createMockDB([
        {
          id: 'sp_1',
          input: 'test',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'pending',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await service.markGenerated('sp_1', {
        title: 'Generated Title',
        description: 'Generated description',
        content: '# Content',
        tags: ['tag1', 'tag2'],
      });

      expect(db.update).toHaveBeenCalledWith(
        'sp_1',
        expect.objectContaining({
          status: 'generated',
          generatedTitle: 'Generated Title',
        })
      );
    });

    it('rejects generation for published posts', async () => {
      db = createMockDB([
        {
          id: 'sp_1',
          input: 'test',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'published',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await expect(
        service.markGenerated('sp_1', {
          title: 'Title',
          description: 'Desc',
          content: '# C',
          tags: [],
        })
      ).rejects.toThrow('Cannot generate');
    });
  });

  describe('markPublished', () => {
    it('updates post status to published with path', async () => {
      db = createMockDB([
        {
          id: 'sp_1',
          input: 'test',
          inputType: 'keywords',
          scheduledDate: new Date('2026-04-01'),
          status: 'generated',
          createdAt: new Date(),
        },
      ]);
      service = new SchedulerService(db);

      await service.markPublished('sp_1', 'nca-ai-cms-content/2026/04/test');

      expect(db.update).toHaveBeenCalledWith(
        'sp_1',
        expect.objectContaining({
          status: 'published',
          publishedPath: 'nca-ai-cms-content/2026/04/test',
        })
      );
    });
  });
});
