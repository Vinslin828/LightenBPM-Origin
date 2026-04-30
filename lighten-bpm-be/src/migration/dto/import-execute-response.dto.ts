import { ApiProperty } from '@nestjs/swagger';
import { ExportType } from '../types/migration.types';

export class ImportExecuteResponseDto {
  @ApiProperty({
    description: 'The type of the imported resource (FORM or WORKFLOW)',
    enum: ExportType,
  })
  type: ExportType;

  @ApiProperty({
    description: 'The public ID of the imported form or workflow',
  })
  public_id: string;

  @ApiProperty({
    description: 'The public ID of the latest imported revision',
  })
  latest_revision_public_id: string;
}
