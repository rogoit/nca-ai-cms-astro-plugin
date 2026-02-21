# OpenSpec: nca-ai-cms-astro-plugin

## Overview

Astro integration plugin that adds an AI-powered content management system. Generates articles and images with Google Gemini, schedules posts, and provides a built-in editor UI via route injection.

**Version:** 1.0.0
**Type:** Astro Integration (ESM)
**Runtime:** Node.js (SSR only)

## Architecture

```
src/
├── index.ts                    # Integration entry point (hooks)
├── config.d.ts                 # Virtual module type declarations
├── db/
│   ├── tables.ts               # AstroDB table definitions
│   └── config.ts               # AstroDB config for extendDb
├── domain/
│   ├── entities/                # Article, ScheduledPost, Source
│   └── value-objects/           # Slug, SEOMetadata, ArticleFinder
├── services/                   # Business logic layer
│   ├── ArticleService.ts       # Filesystem article CRUD
│   ├── ContentGenerator.ts     # Gemini text generation
│   ├── ImageGenerator.ts       # Gemini Imagen generation
│   ├── PromptService.ts        # AstroDB prompts/settings access
│   ├── SchedulerService.ts     # Scheduled post CRUD
│   ├── SchedulerDBAdapter.ts   # AstroDB adapter for scheduler
│   ├── FileWriter.ts           # Article markdown writer
│   ├── ImageConverter.ts       # Base64 → WebP via Sharp
│   ├── ContentFetcher.ts       # URL → Markdown via TurnDown
│   └── AutoPublisher.ts        # Background publish interval
├── utils/
│   ├── markdown.ts             # renderMarkdown() (marked + sanitize)
│   ├── sanitize.ts             # HTML/JSON-LD sanitization
│   └── envUtils.ts             # getEnvVariable()
├── api/                        # Injected API routes
│   ├── _utils.ts               # jsonResponse(), jsonError()
│   ├── generate-content.ts
│   ├── generate-image.ts
│   ├── save.ts
│   ├── save-image.ts
│   ├── prompts.ts
│   ├── scheduler.ts
│   ├── scheduler/
│   │   ├── generate.ts
│   │   ├── publish.ts
│   │   └── [id].ts
│   └── articles/
│       ├── [id].ts
│       └── [id]/
│           ├── apply.ts
│           ├── regenerate-text.ts
│           └── regenerate-image.ts
├── pages/
│   └── editor.astro            # Editor page (React client:load)
└── components/
    ├── Editor.tsx               # Main React editor component
    └── editor/
        ├── GenerateTab.tsx
        ├── PlannerTab.tsx
        ├── SettingsTab.tsx
        ├── styles.ts
        ├── types.ts
        └── useTabNavigation.ts
```

## Design Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| DDD Entities | `domain/entities/` | Business rules on Article, ScheduledPost, Source |
| Value Objects | `domain/value-objects/` | Slug generation, SEO truncation, article lookup |
| Service Layer | `services/` | Orchestration, external API calls, filesystem I/O |
| Repository | `SchedulerDBAdapter` | Abstract DB operations behind interface |
| Dependency Injection | `ContentGenerator`, `SchedulerService` | Accept adapters via constructor |
| Virtual Module | `virtual:nca-ai-cms/config` | Share plugin config with routes without circular deps |

## Integration Hooks

### `astro:db:setup`

Registers three AstroDB tables via `extendDb({ configEntrypoint })`:

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `SiteSettings` | Key-value config store | `key` (text) |
| `Prompts` | Editable AI prompts | `id` (text) |
| `ScheduledPosts` | Content scheduler queue | `id` (text) |

### `astro:config:setup`

- Creates Vite virtual module `virtual:nca-ai-cms/config`
- Injects 13 API routes + 1 page via `injectRoute()`

### `astro:server:start`

- Starts `AutoPublisher` (60-min interval) if `autoPublish === true`

## Plugin Options

```typescript
interface NcaAiCmsPluginOptions {
  contentPath?: string;      // Default: 'nca-ai-cms-content'
  autoPublish?: boolean;     // Default: true in production
}
```

## Package Exports

```json
{
  ".": "./src/index.ts",
  "./services": "./src/services/index.ts",
  "./domain": "./src/domain/index.ts",
  "./domain/entities": "./src/domain/entities/index.ts",
  "./domain/value-objects": "./src/domain/value-objects/index.ts",
  "./utils": "./src/utils/index.ts",
  "./api/*": "./src/api/*",
  "./pages/*": "./src/pages/*",
  "./db/*": "./src/db/*"
}
```

Host projects can import domain objects and services directly:
```typescript
import { Article, ScheduledPost } from 'nca-ai-cms-astro-plugin/domain/entities';
import { ArticleService } from 'nca-ai-cms-astro-plugin/services';
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_GEMINI_API_KEY` | Yes | Gemini API for text + image generation |
| `GOOGLE_GEMINI_MODELS` | No | Override default model names |
| `ASTRO_DB_REMOTE_URL` | Production | Turso database URL |
| `ASTRO_DB_APP_TOKEN` | Production | Turso auth token |
| `ASTRO_DATABASE_FILE` | Local build | SQLite file path for local builds |

## Database Schema

### SiteSettings

| Column | Type | Notes |
|--------|------|-------|
| `key` | text (PK) | Setting identifier |
| `value` | text | Setting value |
| `updatedAt` | date | Auto-set |

### Prompts

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | Prompt identifier |
| `name` | text | Display name |
| `category` | text | `content` / `image` / `analysis` |
| `promptText` | text | Full prompt text |
| `updatedAt` | date | Auto-set |

### ScheduledPosts

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | Format: `sp_{timestamp}_{random}` |
| `input` | text | URL or keywords |
| `inputType` | text | `url` / `keywords` |
| `scheduledDate` | date | When to publish |
| `status` | text | `pending` → `generated` → `published` |
| `generatedTitle` | text (opt) | AI-generated title |
| `generatedDescription` | text (opt) | AI-generated description |
| `generatedContent` | text (opt) | AI-generated markdown |
| `generatedTags` | text (opt) | JSON string array |
| `generatedImageData` | text (opt) | Base64 PNG |
| `generatedImageAlt` | text (opt) | Image alt text |
| `publishedPath` | text (opt) | Filesystem path after publish |
| `createdAt` | date | Auto-set |

## Article Filesystem Convention

```
{contentPath}/{YYYY}/{MM}/{slug}/
├── index.md      # Frontmatter + markdown content
└── hero.webp     # Co-located hero image
```

**Frontmatter format:**
```yaml
---
title: "Article Title"
description: "SEO description"
date: 2026-02-21
tags: ["Semantik", "HTML", "Barrierefrei"]
image: "./hero.webp"
imageAlt: "Alt text for hero image"
---
```

## API Routes

### Content Generation

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/generate-content` | Generate article from URL or keywords |
| POST | `/api/generate-image` | Generate hero image for title |
| POST | `/api/save` | Write article to filesystem |
| POST | `/api/save-image` | Save image as hero.webp |

### Scheduler

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/scheduler` | List all scheduled posts |
| POST | `/api/scheduler` | Create scheduled post |
| DELETE | `/api/scheduler/[id]` | Delete scheduled post |
| POST | `/api/scheduler/generate` | Generate content for post |
| POST | `/api/scheduler/publish` | Publish single or all due posts |

### Articles

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/articles/[id]` | Read article by slug |
| DELETE | `/api/articles/[id]` | Delete article folder |
| POST | `/api/articles/[id]/regenerate-text` | Preview new text |
| POST | `/api/articles/[id]/regenerate-image` | Preview new image |
| POST | `/api/articles/[id]/apply` | Save text/image changes |

### Settings

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/prompts` | Get all prompts + settings |
| POST | `/api/prompts` | Update prompt or setting |

## Scheduled Post Lifecycle

```
pending ──[generate]──→ generated ──[publish]──→ published
   │                       │
   └──[generate]───────────┘  (can regenerate)
```

- **pending**: Created, waiting for content generation
- **generated**: Content + image ready, waiting for publish date
- **published**: Written to filesystem, immutable

`AutoPublisher` checks every 60 minutes for posts where `scheduledDate <= today && status === 'generated'`.

## Development

### Commands

```bash
npm test              # Run unit tests (vitest)
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript check
```

### Peer Dependencies

The host project must provide these packages:

```
astro ^5.0.0
@astrojs/db ^0.18.0
@astrojs/react ^4.0.0
@google/genai ^1.0.0
@google/generative-ai ^0.24.0
gray-matter ^4.0.0
marked ^17.0.0
react ^19.0.0
react-dom ^19.0.0
sanitize-html ^2.0.0
sharp ^0.34.0
turndown ^7.0.0
zod ^3.0.0
```

### Local Development with Host Project

```bash
# In host project:
npm run plugin:link     # Install from local filesystem
npm run dev             # Start dev server with local plugin
npm run plugin:unlink   # Switch back to registry version
```

### Publishing

```bash
# Bump version in package.json
npm publish             # Runs tests via prepublishOnly
```

### Key Rules

1. **No `import.meta.env`** — Use `process.env` via `getEnvVariable()` for server-side secrets
2. **No bare `marked()`** — Always use `renderMarkdown()` which sanitizes output
3. **German slug handling** — Slug value object converts umlauts (ä→ae, ö→oe, ü→ue, ß→ss)
4. **Virtual module for config** — API routes import `virtual:nca-ai-cms/config` for contentPath
5. **AstroDB via configEntrypoint** — Tables registered via URL-based `configEntrypoint` to avoid top-level `astro:db` import
6. **Images always WebP** — ImageConverter uses Sharp (quality 85, effort 6)
7. **Content in German** — Default prompts generate German-language accessibility articles
