import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

export class DatasetRecordListResponseDto extends PaginatedResponseDto<
  Record<string, unknown>
> {
  @ApiProperty({
    type: 'object',
    isArray: true,
    additionalProperties: true,
    example: [{ id: 1, vendor_name: 'Vendor A', score: 100 }],
  })
  declare items: Record<string, unknown>[];
}
