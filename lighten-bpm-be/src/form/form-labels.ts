import { ApiProperty } from '@nestjs/swagger';

export class LabelTranslation {
  @ApiProperty({
    description: 'The default language value (usually English)',
  })
  default: string;

  @ApiProperty({
    description: 'A mapping of language codes to translated values',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  translations: Record<string, string>;
}

/**
 * Holds all label keys and their translations in multiple languages.
 * It is a map where keys are label identifiers and values are LabelTranslation objects.
 */
export type FormLabels = Record<string, LabelTranslation>;
