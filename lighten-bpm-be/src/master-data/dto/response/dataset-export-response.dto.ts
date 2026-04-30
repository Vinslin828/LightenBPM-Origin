import { ApiProperty } from '@nestjs/swagger';
import { DatasetDefinitionResponseDto } from './dataset-definition-response.dto';

export class DatasetExportResponseDto {
  @ApiProperty({ type: DatasetDefinitionResponseDto })
  definition: DatasetDefinitionResponseDto;
}
