import type { AstroIntegration } from 'astro';
import { SiteSettings, Prompts, ScheduledPosts } from './db/tables.js';

export interface NcaAiCmsPluginOptions {
  contentPath?: string;
  autoPublish?: boolean;
}

export default function ncaAiCms(
  options: NcaAiCmsPluginOptions = {}
): AstroIntegration {
  const contentPath = options.contentPath ?? 'nca-ai-cms-content';
  const autoPublish = options.autoPublish ?? process.env.NODE_ENV === 'production';

  return {
    name: 'nca-ai-cms-astro-plugin',
    hooks: {
      'astro:db:setup'({ extendDb }: { extendDb: (config: { tables: Record<string, unknown> }) => void }) {
        extendDb({
          tables: { SiteSettings, Prompts, ScheduledPosts },
        });
      },

      'astro:config:setup'({ injectRoute, updateConfig }) {
        // Virtual module for config sharing
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'nca-ai-cms-virtual-config',
                resolveId(id) {
                  if (id === 'virtual:nca-ai-cms/config') {
                    return '\0virtual:nca-ai-cms/config';
                  }
                },
                load(id) {
                  if (id === '\0virtual:nca-ai-cms/config') {
                    return `export const contentPath = ${JSON.stringify(contentPath)};\nexport const autoPublish = ${JSON.stringify(autoPublish)};`;
                  }
                },
              },
            ],
          },
        });

        // Inject API routes
        injectRoute({
          pattern: '/api/generate-content',
          entrypoint: 'nca-ai-cms-astro-plugin/api/generate-content.ts',
        });
        injectRoute({
          pattern: '/api/generate-image',
          entrypoint: 'nca-ai-cms-astro-plugin/api/generate-image.ts',
        });
        injectRoute({
          pattern: '/api/save',
          entrypoint: 'nca-ai-cms-astro-plugin/api/save.ts',
        });
        injectRoute({
          pattern: '/api/save-image',
          entrypoint: 'nca-ai-cms-astro-plugin/api/save-image.ts',
        });
        injectRoute({
          pattern: '/api/prompts',
          entrypoint: 'nca-ai-cms-astro-plugin/api/prompts.ts',
        });
        injectRoute({
          pattern: '/api/scheduler',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler.ts',
        });
        injectRoute({
          pattern: '/api/scheduler/generate',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/generate.ts',
        });
        injectRoute({
          pattern: '/api/scheduler/publish',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/publish.ts',
        });
        injectRoute({
          pattern: '/api/scheduler/[id]',
          entrypoint: 'nca-ai-cms-astro-plugin/api/scheduler/[id].ts',
        });
        injectRoute({
          pattern: '/api/articles/[id]',
          entrypoint: 'nca-ai-cms-astro-plugin/api/articles/[id].ts',
        });
        injectRoute({
          pattern: '/api/articles/[id]/apply',
          entrypoint: 'nca-ai-cms-astro-plugin/api/articles/[id]/apply.ts',
        });
        injectRoute({
          pattern: '/api/articles/[id]/regenerate-text',
          entrypoint:
            'nca-ai-cms-astro-plugin/api/articles/[id]/regenerate-text.ts',
        });
        injectRoute({
          pattern: '/api/articles/[id]/regenerate-image',
          entrypoint:
            'nca-ai-cms-astro-plugin/api/articles/[id]/regenerate-image.ts',
        });

        // Inject editor page
        injectRoute({
          pattern: '/editor',
          entrypoint: 'nca-ai-cms-astro-plugin/pages/editor.astro',
        });
      },

      'astro:server:start'() {
        if (autoPublish) {
          import('./services/AutoPublisher.js').then(
            ({ startAutoPublisher }) => {
              startAutoPublisher(contentPath);
            }
          ).catch((err) => {
            console.error('[nca-ai-cms] AutoPublisher failed to start:', err);
          });
        }
      },
    },
  };
}

