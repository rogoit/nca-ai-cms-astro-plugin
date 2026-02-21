import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Source } from '../domain/entities/Source';
import { Article, type ArticleProps } from '../domain/entities/Article';
import { ContentFetcher, type FetchedContent } from './ContentFetcher';

// PromptService interface for dependency injection (avoids astro:db import in tests)
export interface IPromptService {
  getPrompt(id: string): Promise<string | null>;
  getCTAConfig(): Promise<{ url: string; style: string; prompt: string }>;
  getCoreTags(): Promise<string[]>;
}

export interface GeneratedContent {
  title: string;
  description: string;
  content: string;
  tags: string[];
}

export interface ContentGeneratorConfig {
  apiKey: string;
  model?: string;
  promptService?: IPromptService;
}

interface SourceAnalysis {
  topic: string;
  keyPoints: string[];
  uniqueInsights: string[];
  codeExamples: string[];
}

// Fallback values when database is not available
const DEFAULT_CONTACT_URL =
  'https://nevercodealone.de/de/landingpages/barrierefreies-webdesign';

const DEFAULT_CORE_TAGS = ['Semantik', 'HTML', 'Barrierefrei'];

const DEFAULT_SYSTEM_PROMPT = `Du bist ein erfahrener technischer Content-Writer für Web-Entwicklung.
Deine Aufgabe ist es, hochwertige deutsche Fachartikel zu erstellen.

Zielgruppe: Content-Marketing-Professionals und Frontend-Entwickler
Tonalität: Professionell, aber zugänglich. Technisch korrekt, nicht übermäßig akademisch.

KRITISCH - 100% Originalität:
- Schreibe einen KOMPLETT EIGENSTÄNDIGEN Artikel
- KEINE Sätze, Formulierungen oder Strukturen aus externen Quellen übernehmen
- KEINE Hinweise auf Quellen, Referenzen oder Inspiration im Text
- Nutze ausschließlich DEIN Expertenwissen zur Barrierefreiheit
- Jeder Satz muss NEU formuliert sein - wie von einem Experten geschrieben
- Der Artikel muss wirken als käme er aus eigener Fachkenntnis

Regeln:
- Schreibe auf Deutsch
- Mindestens 800 Wörter
- Verwende praktische Codebeispiele (eigene Beispiele, nicht kopiert)
- WICHTIG: Content MUSS mit einer H1-Überschrift (# Titel) beginnen
- Danach H2 (##) und H3 (###) Hierarchie ohne Sprünge
- WICHTIG: Nur Markdown, KEINE HTML-Tags wie <p>, <div>, <span> etc.
- WICHTIG: Integriere die Keywords "Semantik", "HTML" und "Barrierefrei" natürlich in den Text

Titel-Regeln:
- Das Hauptthema/Keyword MUSS im Titel vorkommen
- Nutze Zahlen wenn möglich (z.B. "5 Tipps", "3 Fehler")
- Zeige den Nutzen/Benefit (z.B. "So vermeidest du...", "Warum X wichtig ist")
- Wecke Neugier oder löse ein Problem`;

export function buildSourceAnalysisSchema() {
  return {
    type: SchemaType.OBJECT as const,
    properties: {
      topic: {
        type: SchemaType.STRING,
        description: 'Das Hauptthema in 2-5 Wörtern',
      },
      keyPoints: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Die wichtigsten Kernaussagen/Fakten',
      },
      uniqueInsights: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Besondere/einzigartige Erkenntnisse oder Tipps',
      },
      codeExamples: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Wichtige Code-Beispiele oder Patterns',
      },
    },
    required: ['topic', 'keyPoints', 'uniqueInsights', 'codeExamples'],
  } satisfies import('@google/generative-ai').Schema;
}

export class ContentGenerator {
  private client: GoogleGenerativeAI;
  private model: string;
  private fetcher: ContentFetcher;
  private promptService: IPromptService | undefined;

  constructor(config: ContentGeneratorConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.5-flash';
    this.fetcher = new ContentFetcher();
    this.promptService = config.promptService;
  }

  async generateFromUrl(sourceUrl: string): Promise<Article> {
    const source = new Source(sourceUrl);
    const fetchedContent = await this.fetcher.fetch(source);

    // Step 1: Analyze source to detect topic and extract insights
    const analysis = await this.analyzeSource(fetchedContent);

    // Step 2: Generate article based on analysis
    const generated = await this.generateContent(analysis);

    const props: ArticleProps = {
      title: generated.title,
      description: generated.description,
      content: generated.content,
      date: new Date(),
      tags: generated.tags,
    };

    return new Article(props);
  }

  async generateFromKeywords(keywords: string): Promise<Article> {
    // Research the keywords using AI
    const analysis = await this.researchKeywords(keywords);

    // Generate article based on research
    const generated = await this.generateContent(analysis);

    const props: ArticleProps = {
      title: generated.title,
      description: generated.description,
      content: generated.content,
      date: new Date(),
      tags: generated.tags,
    };

    return new Article(props);
  }

  private async analyzeSource(
    fetched: FetchedContent
  ): Promise<SourceAnalysis> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildSourceAnalysisSchema(),
      },
    });

    const prompt = `Analysiere diesen Web-Artikel und extrahiere die wichtigsten Informationen.

Titel: ${fetched.title}
URL: ${fetched.url}

Inhalt:
${fetched.content.slice(0, 12000)}

Identifiziere:
1. Das Hauptthema (fokussiert auf Web-Entwicklung/Barrierefreiheit)
2. Die wichtigsten Kernaussagen
3. Besondere Erkenntnisse oder einzigartige Tipps
4. Relevante Code-Beispiele oder Patterns`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse source analysis response: ${text.slice(0, 200)}`);
    }
  }

  private async researchKeywords(keywords: string): Promise<SourceAnalysis> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildSourceAnalysisSchema(),
      },
    });

    const prompt = `Du bist ein Experte für Web-Accessibility und barrierefreie Webentwicklung.

Recherchiere zum Thema: "${keywords}"

Nutze dein Fachwissen um:
1. Das Hauptthema klar zu definieren (Bezug zu Barrierefreiheit/Web-Accessibility)
2. Die wichtigsten Fakten, Best Practices und WCAG-Richtlinien zusammenzufassen
3. Weniger bekannte aber wichtige Tipps und Erkenntnisse zu identifizieren
4. Praktische Code-Beispiele oder Patterns vorzuschlagen

Fokussiere auf aktuelle Standards und praktische Anwendbarkeit.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse keyword research response: ${text.slice(0, 200)}`);
    }
  }

  private async generateContent(
    analysis: SourceAnalysis
  ): Promise<GeneratedContent> {
    const systemPrompt = await this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(analysis);
    const coreTags = await this.getCoreTags();

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: 'SEO-optimierter Titel, max 60 Zeichen',
            },
            description: {
              type: SchemaType.STRING,
              description: 'Meta-Description, max 155 Zeichen',
            },
            tags: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'Relevante Tags für den Artikel',
            },
            content: {
              type: SchemaType.STRING,
              description:
                'Vollständiger Markdown-Inhalt. MUSS mit H1 (# Titel) beginnen, dann H2/H3 Hierarchie. Keine HTML-Tags.',
            },
          },
          required: ['title', 'description', 'tags', 'content'],
        },
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    let data: { title: string; description: string; content: string; tags: string[] };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse generated content response: ${text.slice(0, 200)}`);
    }

    return {
      title: data.title,
      description: data.description,
      content: data.content,
      tags: [...new Set([...coreTags, ...data.tags])],
    };
  }

  private async buildSystemPrompt(): Promise<string> {
    // Try to load from database
    if (this.promptService) {
      try {
        const [basePrompt, ctaConfig] = await Promise.all([
          this.promptService.getPrompt('system_prompt'),
          this.promptService.getCTAConfig(),
        ]);

        if (basePrompt) {
          // Add CTA instructions to the system prompt
          return `${basePrompt}

- WICHTIG: Beende den Artikel mit einem einzigartigen Call-to-Action:
  - Link: ${ctaConfig.url}
  - Stil: ${ctaConfig.style}
  ${ctaConfig.prompt}`;
        }
      } catch (error) {
        console.warn('Failed to load prompts from database, using defaults');
      }
    }

    // Fallback to default with static CTA
    return `${DEFAULT_SYSTEM_PROMPT}

- WICHTIG: Beende den Artikel mit einem Call-to-Action, der zum Thema passt.
  Verwende diesen Link: [Kontakt aufnehmen](${DEFAULT_CONTACT_URL})`;
  }

  private buildUserPrompt(analysis: SourceAnalysis): string {
    return `Schreibe als Accessibility-Experte einen deutschen Fachartikel zum Thema: ${analysis.topic}

Behandle diese Aspekte aus deinem Fachwissen:
${analysis.keyPoints.map((p) => `- ${p}`).join('\n')}
${analysis.uniqueInsights.map((p) => `- ${p}`).join('\n')}

${analysis.codeExamples.length > 0 ? `Zeige praktische Code-Beispiele für:\n${analysis.codeExamples.map((c) => `- ${c}`).join('\n')}` : ''}

Wichtig: Schreibe komplett eigenständig aus deiner Expertise heraus.`;
  }

  private async getCoreTags(): Promise<string[]> {
    if (this.promptService) {
      try {
        return await this.promptService.getCoreTags();
      } catch {
        // Fall through to default
      }
    }
    return DEFAULT_CORE_TAGS;
  }
}
