import { ApiProperty } from '@nestjs/swagger';
import { FormRevisionDto } from '../../form/dto/form-revision.dto';
import { JsonObject } from '@prisma/client/runtime/library';

export class FormInstanceDto {
  @ApiProperty({
    description: 'The UUID of the form instance',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The form revision associated with the instance',
    type: () => FormRevisionDto,
  })
  revision: FormRevisionDto;

  @ApiProperty({
    description: 'The data submitted in the form instance',
    type: 'object',
    additionalProperties: true,
  })
  form_data: any;

  @ApiProperty({
    description: 'The ID of the user who last updated the form instance',
  })
  updatedBy: number;

  @ApiProperty({
    description: 'The date and time when the form instance was last updated',
    format: 'date-time',
  })
  updatedAt: Date;

  constructor(data: Partial<FormInstanceDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(data: FormInstanceDto): FormInstanceDto {
    return new FormInstanceDto({
      id: data.id,
      revision: data.revision,
      form_data: data.form_data as JsonObject,
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt,
    });
  }
}
