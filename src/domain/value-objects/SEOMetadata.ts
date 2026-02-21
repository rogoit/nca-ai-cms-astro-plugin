export class SEOMetadata {
  readonly title: string;
  readonly description: string;

  static readonly MAX_TITLE_LENGTH = 60;
  static readonly MAX_DESCRIPTION_LENGTH = 155;

  constructor(title: string, description: string) {
    this.title =
      title.length > SEOMetadata.MAX_TITLE_LENGTH
        ? title.slice(0, SEOMetadata.MAX_TITLE_LENGTH - 3) + '...'
        : title;

    this.description =
      description.length > SEOMetadata.MAX_DESCRIPTION_LENGTH
        ? description.slice(0, SEOMetadata.MAX_DESCRIPTION_LENGTH - 3) + '...'
        : description;
  }
}
