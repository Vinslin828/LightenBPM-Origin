import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiConfigDto } from './api-config.dto';

export class TestExternalApiDto {
  @ApiProperty({ type: ApiConfigDto })
  @ValidateNested()
  @Type(() => ApiConfigDto)
  api_config: ApiConfigDto;
}
