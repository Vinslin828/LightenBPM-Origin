import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InlineValidatorDto {
  @ApiProperty({
    description: 'Inline validation expression code',
    example: 'function validation(value) { return value > 0; }',
  })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'Error message to use when validation fails',
    example: 'Value must be positive',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class ValidateFieldsDto {
  @ApiPropertyOptional({
    description: 'Array of inline validators to execute',
    type: [InlineValidatorDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InlineValidatorDto)
  codes?: InlineValidatorDto[];

  @ApiPropertyOptional({
    description: 'Array of registry validator IDs to look up and execute',
    example: ['validator-uuid-1', 'validator-uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  registryIds?: string[];

  @ApiPropertyOptional({
    description:
      'The field name whose value will be passed as the argument to validation(value). Required for component-level validation.',
    example: 'field_1',
  })
  @IsOptional()
  @IsString()
  currentField?: string;

  @ApiPropertyOptional({
    description:
      'Array of form-level validators to execute. These run against the full formData without a specific field value.',
    type: [InlineValidatorDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InlineValidatorDto)
  formValidators?: InlineValidatorDto[];

  @ApiPropertyOptional({
    description: 'Current form data for expression evaluation context',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}
