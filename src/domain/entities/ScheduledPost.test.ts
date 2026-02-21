import { describe, it, expect } from 'vitest';
import { ScheduledPost } from './ScheduledPost';
import type { ScheduledPostInputType } from './ScheduledPost';

describe('ScheduledPost', () => {
  const defaultProps = {
    input: 'ARIA Landmarks barrierefreie Navigation',
    inputType: 'keywords' as ScheduledPostInputType,
    scheduledDate: new Date('2026-03-15'),
  };

  it('creates a scheduled post with pending status', () => {
    const post = ScheduledPost.create(defaultProps);
    expect(post.status).toBe('pending');
    expect(post.input).toBe(defaultProps.input);
    expect(post.inputType).toBe('keywords');
  });

  it('generates a unique id starting with sp_', () => {
    const post = ScheduledPost.create(defaultProps);
    expect(post.id).toMatch(/^sp_/);
  });

  it('sets createdAt to current date', () => {
    const before = new Date();
    const post = ScheduledPost.create(defaultProps);
    const after = new Date();
    expect(post.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(post.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('detects URL input type', () => {
    expect(ScheduledPost.detectInputType('https://example.com')).toBe('url');
    expect(ScheduledPost.detectInputType('http://example.com')).toBe('url');
  });

  it('detects keywords input type', () => {
    expect(ScheduledPost.detectInputType('ARIA Landmarks')).toBe('keywords');
    expect(ScheduledPost.detectInputType('barrierefreie Navigation')).toBe(
      'keywords'
    );
  });

  it('can transition from pending to generated', () => {
    const post = ScheduledPost.create(defaultProps);
    expect(post.canGenerate()).toBe(true);
    expect(post.canPublish()).toBe(false);
  });

  it('can regenerate when already generated', () => {
    const post = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      status: 'generated',
      createdAt: new Date(),
    });
    expect(post.canGenerate()).toBe(true);
    expect(post.canPublish()).toBe(true);
  });

  it('cannot generate or publish when already published', () => {
    const post = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      status: 'published',
      createdAt: new Date(),
    });
    expect(post.canGenerate()).toBe(false);
    expect(post.canPublish()).toBe(false);
  });

  it('can delete when not published', () => {
    const pending = ScheduledPost.create(defaultProps);
    expect(pending.canDelete()).toBe(true);

    const generated = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      status: 'generated',
      createdAt: new Date(),
    });
    expect(generated.canDelete()).toBe(true);

    const published = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      status: 'published',
      createdAt: new Date(),
    });
    expect(published.canDelete()).toBe(false);
  });

  it('determines if a post is due for auto-publish', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const post = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      scheduledDate: yesterday,
      status: 'generated',
      createdAt: new Date(),
    });
    expect(post.isDue()).toBe(true);
  });

  it('is not due if date is in the future', () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const post = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      scheduledDate: nextWeek,
      status: 'generated',
      createdAt: new Date(),
    });
    expect(post.isDue()).toBe(false);
  });

  it('is not due if status is pending', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const post = ScheduledPost.fromDB({
      ...defaultProps,
      id: 'sp_1',
      scheduledDate: yesterday,
      status: 'pending',
      createdAt: new Date(),
    });
    expect(post.isDue()).toBe(false);
  });

  it('computes year and month from scheduledDate', () => {
    const post = ScheduledPost.create({
      ...defaultProps,
      scheduledDate: new Date('2026-03-15'),
    });
    expect(post.scheduledYear).toBe(2026);
    expect(post.scheduledMonth).toBe('03');
  });

  it('reconstructs from DB row', () => {
    const post = ScheduledPost.fromDB({
      id: 'sp_123',
      input: 'test keywords',
      inputType: 'keywords',
      scheduledDate: new Date('2026-04-01'),
      status: 'generated',
      generatedTitle: 'Test Title',
      generatedDescription: 'Test desc',
      generatedContent: '# Test',
      generatedTags: '["tag1","tag2"]',
      generatedImageData: 'base64data',
      generatedImageAlt: 'alt text',
      publishedPath: null,
      createdAt: new Date('2026-01-01'),
    });

    expect(post.id).toBe('sp_123');
    expect(post.status).toBe('generated');
    expect(post.generatedTitle).toBe('Test Title');
    expect(post.parsedTags).toEqual(['tag1', 'tag2']);
  });

  it('returns empty array for null tags', () => {
    const post = ScheduledPost.create(defaultProps);
    expect(post.parsedTags).toEqual([]);
  });

  describe('isDue() timezone safety', () => {
    it('is due when scheduled for today (UTC)', () => {
      const today = new Date();
      const post = ScheduledPost.fromDB({
        ...defaultProps,
        id: 'sp_tz1',
        scheduledDate: today,
        status: 'generated',
        createdAt: new Date(),
      });
      expect(post.isDue()).toBe(true);
    });

    it('is due when scheduled date is an ISO string parsed as UTC', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isoDate = yesterday.toISOString().slice(0, 10);

      const post = ScheduledPost.fromDB({
        ...defaultProps,
        id: 'sp_tz2',
        scheduledDate: new Date(isoDate),
        status: 'generated',
        createdAt: new Date(),
      });
      expect(post.isDue()).toBe(true);
    });

    it('is not due when scheduled for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const post = ScheduledPost.fromDB({
        ...defaultProps,
        id: 'sp_tz3',
        scheduledDate: tomorrow,
        status: 'generated',
        createdAt: new Date(),
      });
      expect(post.isDue()).toBe(false);
    });

    it('is not due when status is published', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const post = ScheduledPost.fromDB({
        ...defaultProps,
        id: 'sp_tz4',
        scheduledDate: yesterday,
        status: 'published',
        createdAt: new Date(),
      });
      expect(post.isDue()).toBe(false);
    });
  });
});
