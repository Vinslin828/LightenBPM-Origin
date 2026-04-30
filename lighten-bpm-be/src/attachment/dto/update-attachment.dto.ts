import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAttachmentDto {
  @ApiPropertyOptional({
    description: 'Optional user remark',
    example: 'Updated remark',
  })
  @IsString()
  @IsOptional()
  remark?: string;
}
