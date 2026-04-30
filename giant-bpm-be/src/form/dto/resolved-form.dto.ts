import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormOptionsDto } from './form-revision.dto';
import type { ApplicantSource } from '../../flow-engine/types';
import { FormSchema } from '../../flow-engine/types';
import { Form, FormOptions } from '../../common/types/common.types';
import { FormRevisionWithOptions } from '../types/form.types';

/**
 * DTO for form with resolved reference values
 * Used when fetching a form for new application submission
 */
export class ResolvedFormDto {
  @ApiProperty({
    description: 'Form ID (public_id)',
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Form revision ID',
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  revisionId: string;

  @ApiProperty({
    description: 'Form name',
    example: 'Leave Application Form',
  })
  name: string;

  @ApiProperty({
    description: 'Form description',
    required: false,
    example: 'Form for requesting leave',
  })
  description?: string;

  @ApiProperty({
    description:
      'Form schema with resolved references. Reference values (isReference: true) are replaced with their evaluated values.',
    type: 'object',
    additionalProperties: true,
  })
  formSchema: object;

  @ApiProperty({
    description: 'Form options',
    type: () => FormOptionsDto,
  })
  options: FormOptionsDto;

  @ApiPropertyOptional({
    description:
      'Applicant source configured in the workflow start node. ' +
      '"submitter" means the logged-in user is the applicant; ' +
      '"selection" means the user must pick an applicant.',
    enum: ['submitter', 'selection'],
    example: 'submitter',
  })
  applicantSource?: ApplicantSource;

  static fromPrisma(
    form: Form,
    revision: FormRevisionWithOptions,
    resolvedSchema: FormSchema,
    applicantSource?: ApplicantSource,
  ): ResolvedFormDto {
    const dto = new ResolvedFormDto();
    dto.id = form.public_id;
    dto.revisionId = revision.public_id;
    dto.name = revision.name;
    dto.description = revision.description || undefined;
    dto.formSchema = resolvedSchema;
    dto.options = revision.options as FormOptions;
    dto.applicantSource = applicantSource;
    return dto;
  }
}
