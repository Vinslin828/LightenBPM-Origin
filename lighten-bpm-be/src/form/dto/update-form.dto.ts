import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsArray, IsNumber } from 'class-validator';

export class UpdateFormDto {
  @ApiProperty({
    description: 'An array of tag IDs to associate with the form',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];

  @ApiProperty({
    description: 'The new active status of the form',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
