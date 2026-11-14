/** Validation failure carrying the offending field path for precise UI feedback. */
export class ProjectParseError extends Error {
  readonly field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = 'ProjectParseError';
    this.field = field;
  }
}
