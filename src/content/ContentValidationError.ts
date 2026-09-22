export type ContentValidationFailureCodeV1 =
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'INVALID_PACK_ID'
  | 'INVALID_PACK_VERSION'
  | 'INVALID_DEFINITION'
  | 'INVALID_CONTENT_ID'
  | 'ID_KIND_MISMATCH'
  | 'DUPLICATE_ID'
  | 'INVALID_VALUE'
  | 'MISSING_REFERENCE'
  | 'WRONG_REFERENCE_KIND'
  | 'INVALID_CROSS_REFERENCE'
  | 'CONTENT_COMPATIBILITY_MISMATCH';

export interface ContentValidationErrorV1 {
  readonly code: ContentValidationFailureCodeV1;
  readonly definitionId?: string;
  readonly path?: string;
  readonly message: string;
}

function compareOptional(
  left: string | undefined,
  right: string | undefined,
): number {
  return (left ?? '').localeCompare(right ?? '');
}

export function sortContentValidationErrors(
  errors: readonly ContentValidationErrorV1[],
): readonly ContentValidationErrorV1[] {
  return Object.freeze(
    [...errors].sort((left, right) =>
      compareOptional(left.definitionId, right.definitionId)
      || compareOptional(left.path, right.path)
      || left.code.localeCompare(right.code)
      || left.message.localeCompare(right.message),
    ),
  );
}

export class ContentValidationException extends Error {
  public readonly errors: readonly ContentValidationErrorV1[];

  public constructor(errors: readonly ContentValidationErrorV1[]) {
    const sorted = sortContentValidationErrors(errors);
    super(
      sorted.length === 0
        ? 'Content validation failed.'
        : `Content validation failed: ${sorted[0]?.code} ${sorted[0]?.message}`,
    );

    this.name = 'ContentValidationException';
    this.errors = sorted;
  }
}
