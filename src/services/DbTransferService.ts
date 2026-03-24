// @ts-ignore - resolved by Astro build pipeline
import { db, SiteSettings, Prompts, ScheduledPosts } from 'astro:db';

export interface SiteSettingRow {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PromptRow {
  id: string;
  name: string;
  category: string;
  promptText: string;
  updatedAt: string;
}

export interface ScheduledPostRow {
  id: string;
  input: string;
  inputType: string;
  scheduledDate: string;
  status: string;
  generatedTitle?: string | null;
  generatedDescription?: string | null;
  generatedContent?: string | null;
  generatedTags?: string | null;
  generatedImageData?: string | null;
  generatedImageAlt?: string | null;
  publishedPath?: string | null;
  createdAt: string;
}

export interface DbTransferPayload {
  version: number;
  exportedAt: string;
  tables: {
    siteSettings: SiteSettingRow[];
    prompts: PromptRow[];
    scheduledPosts: ScheduledPostRow[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SUPPORTED_VERSIONS = [1];

export function validateImportPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];
  const data = payload as Record<string, unknown>;

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Payload must be a JSON object'] };
  }

  if (typeof data.version !== 'number' || !SUPPORTED_VERSIONS.includes(data.version)) {
    errors.push(`Missing or unsupported "version" field (supported: ${SUPPORTED_VERSIONS.join(', ')})`);
  }

  if (!data.tables || typeof data.tables !== 'object') {
    errors.push('Missing or invalid "tables" field');
    return { valid: false, errors };
  }

  const tables = data.tables as Record<string, unknown>;

  // Require all three table keys to be present as arrays
  if (!Array.isArray(tables.siteSettings)) {
    errors.push('Missing or invalid "tables.siteSettings" (must be an array)');
  }
  if (!Array.isArray(tables.prompts)) {
    errors.push('Missing or invalid "tables.prompts" (must be an array)');
  }
  if (!Array.isArray(tables.scheduledPosts)) {
    errors.push('Missing or invalid "tables.scheduledPosts" (must be an array)');
  }

  // If any table key is missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate siteSettings rows
  for (let i = 0; i < (tables.siteSettings as any[]).length; i++) {
    const row = (tables.siteSettings as any[])[i] as Record<string, unknown>;
    if (!row || typeof row.key !== 'string' || typeof row.value !== 'string') {
      errors.push(`siteSettings[${i}]: missing required fields "key" and "value"`);
    }
  }

  // Validate prompts rows
  for (let i = 0; i < (tables.prompts as any[]).length; i++) {
    const row = (tables.prompts as any[])[i] as Record<string, unknown>;
    if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' ||
        typeof row.category !== 'string' || typeof row.promptText !== 'string') {
      errors.push(`prompts[${i}]: missing required fields "id", "name", "category", "promptText"`);
    }
  }

  // Validate scheduledPosts rows (all non-optional columns from schema)
  for (let i = 0; i < (tables.scheduledPosts as any[]).length; i++) {
    const row = (tables.scheduledPosts as any[])[i] as Record<string, unknown>;
    if (!row || typeof row.id !== 'string' || typeof row.input !== 'string' ||
        typeof row.inputType !== 'string' || typeof row.scheduledDate !== 'string' ||
        typeof row.status !== 'string' || typeof row.createdAt !== 'string') {
      errors.push(`scheduledPosts[${i}]: missing required fields "id", "input", "inputType", "scheduledDate", "status", "createdAt"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export class DbTransferService {
  async exportAll(): Promise<DbTransferPayload> {
    const [siteSettings, prompts, scheduledPosts] = await Promise.all([
      db.select().from(SiteSettings),
      db.select().from(Prompts),
      db.select().from(ScheduledPosts),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      tables: {
        siteSettings: siteSettings.map((row: any) => ({
          key: row.key,
          value: row.value,
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
        })),
        prompts: prompts.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          promptText: row.promptText,
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
        })),
        scheduledPosts: scheduledPosts.map((row: any) => ({
          id: row.id,
          input: row.input,
          inputType: row.inputType,
          scheduledDate: row.scheduledDate instanceof Date ? row.scheduledDate.toISOString() : String(row.scheduledDate),
          status: row.status,
          generatedTitle: row.generatedTitle ?? null,
          generatedDescription: row.generatedDescription ?? null,
          generatedContent: row.generatedContent ?? null,
          generatedTags: row.generatedTags ?? null,
          generatedImageData: row.generatedImageData ?? null,
          generatedImageAlt: row.generatedImageAlt ?? null,
          publishedPath: row.publishedPath ?? null,
          createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        })),
      },
    };
  }

  /**
   * Replace all content data atomically using db.batch().
   * Deletes all existing rows in each table, then inserts the imported rows.
   * Sessions table is untouched — user stays logged in.
   */
  async importAll(payload: DbTransferPayload): Promise<{ imported: Record<string, number> }> {
    const { siteSettings, prompts, scheduledPosts } = payload.tables;

    const statements: any[] = [];

    // Delete all existing rows from content tables
    statements.push(db.delete(SiteSettings));
    statements.push(db.delete(Prompts));
    statements.push(db.delete(ScheduledPosts));

    // Insert new SiteSettings
    for (const row of siteSettings) {
      statements.push(
        db.insert(SiteSettings).values({
          key: row.key,
          value: row.value,
          updatedAt: new Date(row.updatedAt),
        })
      );
    }

    // Insert new Prompts
    for (const row of prompts) {
      statements.push(
        db.insert(Prompts).values({
          id: row.id,
          name: row.name,
          category: row.category,
          promptText: row.promptText,
          updatedAt: new Date(row.updatedAt),
        })
      );
    }

    // Insert new ScheduledPosts
    for (const row of scheduledPosts) {
      statements.push(
        db.insert(ScheduledPosts).values({
          id: row.id,
          input: row.input,
          inputType: row.inputType,
          scheduledDate: new Date(row.scheduledDate),
          status: row.status,
          generatedTitle: row.generatedTitle ?? undefined,
          generatedDescription: row.generatedDescription ?? undefined,
          generatedContent: row.generatedContent ?? undefined,
          generatedTags: row.generatedTags ?? undefined,
          generatedImageData: row.generatedImageData ?? undefined,
          generatedImageAlt: row.generatedImageAlt ?? undefined,
          publishedPath: row.publishedPath ?? undefined,
          createdAt: new Date(row.createdAt),
        })
      );
    }

    await db.batch(statements);

    return {
      imported: {
        siteSettings: siteSettings.length,
        prompts: prompts.length,
        scheduledPosts: scheduledPosts.length,
      },
    };
  }
}
