import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { DatasetDefinitionResponseDto } from './dataset-definition-response.dto';

export class DatasetListResponseDto extends PaginatedResponseDto<DatasetDefinitionResponseDto> {
  @ApiProperty({ type: [DatasetDefinitionResponseDto] })
  declare items: DatasetDefinitionResponseDto[];
}
