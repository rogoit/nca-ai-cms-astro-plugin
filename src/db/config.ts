import { defineDb } from 'astro:db';
import { SiteSettings, Prompts, ScheduledPosts } from './tables.js';

export default defineDb({
  tables: { SiteSettings, Prompts, ScheduledPosts },
});
