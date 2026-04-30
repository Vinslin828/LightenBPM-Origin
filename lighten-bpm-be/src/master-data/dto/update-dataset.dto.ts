import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDatasetDto {
  @ApiPropertyOptional({ example: 'Updated Vendor List' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
