import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'The name of the tag', example: 'Urgent' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A description for the tag',
    required: false,
    example: 'For tasks that require immediate attention',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'A hex color code for the tag',
    required: false,
    example: '#FF0000',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
