import { ApiProperty } from '@nestjs/swagger';
import { DatasetDefinitionResponseDto } from './dataset-definition-response.dto';

export class DatasetImportResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: DatasetDefinitionResponseDto })
  definition: DatasetDefinitionResponseDto;
}
