export type ScheduledPostStatus = 'pending' | 'generated' | 'published';
export type ScheduledPostInputType = 'url' | 'keywords';

export interface ScheduledPostProps {
  input: string;
  inputType: ScheduledPostInputType;
  scheduledDate: Date;
}

export interface ScheduledPostDBRow {
  id: string;
  input: string;
  inputType: string;
  scheduledDate: Date;
  status: string;
  generatedTitle?: string | null;
  generatedDescription?: string | null;
  generatedContent?: string | null;
  generatedTags?: string | null;
  generatedImageData?: string | null;
  generatedImageAlt?: string | null;
  publishedPath?: string | null;
  createdAt: Date;
}

export class ScheduledPost {
  readonly id: string;
  readonly input: string;
  readonly inputType: ScheduledPostInputType;
  readonly scheduledDate: Date;
  readonly status: ScheduledPostStatus;
  readonly generatedTitle: string | null | undefined;
  readonly generatedDescription: string | null | undefined;
  readonly generatedContent: string | null | undefined;
  readonly generatedTags: string | null | undefined;
  readonly generatedImageData: string | null | undefined;
  readonly generatedImageAlt: string | null | undefined;
  readonly publishedPath: string | null | undefined;
  readonly createdAt: Date;

  private constructor(
    id: string,
    input: string,
    inputType: ScheduledPostInputType,
    scheduledDate: Date,
    status: ScheduledPostStatus,
    createdAt: Date,
    generatedTitle: string | null | undefined,
    generatedDescription: string | null | undefined,
    generatedContent: string | null | undefined,
    generatedTags: string | null | undefined,
    generatedImageData: string | null | undefined,
    generatedImageAlt: string | null | undefined,
    publishedPath: string | null | undefined
  ) {
    this.id = id;
    this.input = input;
    this.inputType = inputType;
    this.scheduledDate = scheduledDate;
    this.status = status;
    this.createdAt = createdAt;
    this.generatedTitle = generatedTitle;
    this.generatedDescription = generatedDescription;
    this.generatedContent = generatedContent;
    this.generatedTags = generatedTags;
    this.generatedImageData = generatedImageData;
    this.generatedImageAlt = generatedImageAlt;
    this.publishedPath = publishedPath;
  }

  static create(props: ScheduledPostProps): ScheduledPost {
    const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return new ScheduledPost(
      id,
      props.input,
      props.inputType,
      props.scheduledDate,
      'pending',
      new Date(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  }

  static fromDB(row: ScheduledPostDBRow): ScheduledPost {
    return new ScheduledPost(
      row.id,
      row.input,
      row.inputType as ScheduledPostInputType,
      row.scheduledDate,
      row.status as ScheduledPostStatus,
      row.createdAt,
      row.generatedTitle,
      row.generatedDescription,
      row.generatedContent,
      row.generatedTags,
      row.generatedImageData,
      row.generatedImageAlt,
      row.publishedPath
    );
  }

  static detectInputType(input: string): ScheduledPostInputType {
    try {
      new URL(input);
      return 'url';
    } catch {
      return 'keywords';
    }
  }

  canGenerate(): boolean {
    return this.status === 'pending' || this.status === 'generated';
  }

  canPublish(): boolean {
    return this.status === 'generated';
  }

  canDelete(): boolean {
    return this.status !== 'published';
  }

  isDue(): boolean {
    if (this.status !== 'generated') return false;
    const nowDate = new Date().toISOString().slice(0, 10);
    const scheduledDate = new Date(this.scheduledDate).toISOString().slice(0, 10);
    return scheduledDate <= nowDate;
  }

  get scheduledYear(): number {
    return this.scheduledDate.getFullYear();
  }

  get scheduledMonth(): string {
    return String(this.scheduledDate.getMonth() + 1).padStart(2, '0');
  }

  get parsedTags(): string[] {
    if (!this.generatedTags) return [];
    try {
      return JSON.parse(this.generatedTags);
    } catch {
      return [];
    }
  }
}
