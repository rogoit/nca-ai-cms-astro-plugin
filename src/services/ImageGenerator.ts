import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Slug } from '../domain/value-objects/Slug';

export interface GeneratedImage {
  url: string;
  alt: string;
  filepath: string;
  base64?: string;
}

export interface ImageGeneratorConfig {
  apiKey: string;
  model?: string;
}

export class ImageGenerator {
  private client: GoogleGenAI;
  private textClient: GoogleGenerativeAI;
  private model: string;

  constructor(config: ImageGeneratorConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.textClient = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'imagen-4.0-generate-001';
  }

  async generate(title: string): Promise<GeneratedImage> {
    const prompt = this.buildPrompt(title);
    const filename = await this.generateSeoFilename(title);
    const filepath = `dist/client/images/${filename}.webp`;

    try {
      const response = await this.client.models.generateImages({
        model: this.model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          personGeneration: PersonGeneration.DONT_ALLOW,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = response.generatedImages[0];
      if (!imageData) {
        throw new Error('No image data in response');
      }
      const base64 = imageData.image?.imageBytes;

      if (!base64) {
        throw new Error('No image data received');
      }

      return {
        url: `data:image/png;base64,${base64}`,
        alt: this.generateAlt(title),
        filepath,
        base64,
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildPrompt(title: string): string {
    return `Blog header image about "${title}" for a web accessibility article. Minimal Precisionism style inspired by Charles Sheeler: clean geometric shapes, sharp focus, smooth surfaces, no people. IMPORTANT: absolutely no text, no letters, no words, no typography, no labels, no captions anywhere in the image.`;
  }

  private generateAlt(title: string): string {
    return `Illustration zum Thema ${title} - Barrierefreiheit im Web`;
  }

  private async generateSeoFilename(title: string): Promise<string> {
    const model = this.textClient.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const prompt = `Generate a single SEO-optimized filename for an image about web accessibility article titled "${title}".
Requirements:
- German and English keywords mixed
- Lowercase, words separated by hyphens
- Max 5-6 words
- No file extension
- Focus on: barrierefreiheit, accessibility, web, and the topic
- Return ONLY the filename, nothing else

Example for topic "Forms": barrierefreiheit-formulare-accessible-forms`;

    try {
      const result = await model.generateContent(prompt);
      const filename = result.response
        .text()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      return filename || Slug.generate(`barrierefreiheit-${title}`);
    } catch {
      return Slug.generate(`barrierefreiheit-${title}-accessibility`);
    }
  }
}
