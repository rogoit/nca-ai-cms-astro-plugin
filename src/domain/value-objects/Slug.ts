export class Slug {
  private readonly value: string;

  constructor(input: string) {
    this.value = Slug.generate(input);
  }

  static generate(input: string): string {
    return (
      input
        .toLowerCase()
        // Handle German special characters BEFORE normalization
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        // Now normalize and remove remaining diacritics
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '') // Trim hyphens from start/end
        .replace(/-+/g, '-')
    ); // Replace multiple hyphens with single
  }

  toString(): string {
    return this.value;
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
