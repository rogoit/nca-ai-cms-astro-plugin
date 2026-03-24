// @ts-ignore - resolved by Astro build pipeline
import { db, SiteSettings, Prompts, eq } from 'astro:db';

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

export interface DbTransferPayload {
  version: number;
  exportedAt: string;
  siteSettings?: SiteSettingRow[];
  prompts?: PromptRow[];
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

  const hasSiteSettings = 'siteSettings' in data;
  const hasPrompts = 'prompts' in data;

  if (!hasSiteSettings && !hasPrompts) {
    errors.push('Payload must contain at least one of "siteSettings" or "prompts"');
    return { valid: false, errors };
  }

  if (hasSiteSettings) {
    if (!Array.isArray(data.siteSettings)) {
      errors.push('"siteSettings" must be an array');
    } else {
      for (let i = 0; i < data.siteSettings.length; i++) {
        const row = data.siteSettings[i] as Record<string, unknown>;
        if (!row || typeof row.key !== 'string' || typeof row.value !== 'string') {
          errors.push(`siteSettings[${i}]: missing required fields "key" and "value"`);
        }
      }
    }
  }

  if (hasPrompts) {
    if (!Array.isArray(data.prompts)) {
      errors.push('"prompts" must be an array');
    } else {
      for (let i = 0; i < data.prompts.length; i++) {
        const row = data.prompts[i] as Record<string, unknown>;
        if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' ||
            typeof row.category !== 'string' || typeof row.promptText !== 'string') {
          errors.push(`prompts[${i}]: missing required fields "id", "name", "category", "promptText"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export class DbTransferService {
  async exportAll(): Promise<DbTransferPayload> {
    const [siteSettings, prompts] = await Promise.all([
      db.select().from(SiteSettings),
      db.select().from(Prompts),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
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
    };
  }

  /**
   * Merge imported data into the live database using upsert semantics.
   * Only sections present in the payload are touched. Existing data not
   * referenced in the payload is left untouched.
   */
  async importAll(payload: DbTransferPayload): Promise<{ imported: Record<string, number> }> {
    const counts: Record<string, number> = {};

    if (payload.siteSettings) {
      for (const row of payload.siteSettings) {
        const existing = await db.select().from(SiteSettings)
          .where(eq(SiteSettings.key, row.key)).get();
        if (existing) {
          await db.update(SiteSettings)
            .set({ value: row.value, updatedAt: new Date(row.updatedAt) })
            .where(eq(SiteSettings.key, row.key));
        } else {
          await db.insert(SiteSettings).values({
            key: row.key,
            value: row.value,
            updatedAt: new Date(row.updatedAt),
          });
        }
      }
      counts.siteSettings = payload.siteSettings.length;
    }

    if (payload.prompts) {
      for (const row of payload.prompts) {
        const existing = await db.select().from(Prompts)
          .where(eq(Prompts.id, row.id)).get();
        if (existing) {
          await db.update(Prompts)
            .set({
              name: row.name,
              category: row.category,
              promptText: row.promptText,
              updatedAt: new Date(row.updatedAt),
            })
            .where(eq(Prompts.id, row.id));
        } else {
          await db.insert(Prompts).values({
            id: row.id,
            name: row.name,
            category: row.category,
            promptText: row.promptText,
            updatedAt: new Date(row.updatedAt),
          });
        }
      }
      counts.prompts = payload.prompts.length;
    }

    return { imported: counts };
  }
}
