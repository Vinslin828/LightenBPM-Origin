import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInstanceShareDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BatchCreateInstanceShareDto {
  @ApiProperty({ type: [CreateInstanceShareDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstanceShareDto)
  shares: CreateInstanceShareDto[];
}

export class InstanceShareDto extends CreateInstanceShareDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsInt()
  workflow_instance_id: number;

  @ApiProperty({ description: 'The permission type, e.g., VIEW' })
  @IsString()
  permission: string;

  @ApiProperty()
  @IsInt()
  created_by: number;

  @ApiProperty()
  @IsDate()
  created_at: Date;
}

export class AggregatedInstanceShareActionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty({ description: 'The permission type, e.g., VIEW' })
  @IsString()
  permission: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty()
  @IsInt()
  created_by: number;

  @ApiProperty()
  @IsDate()
  created_at: Date;
}

export class AggregatedInstanceShareDto {
  @ApiProperty()
  @IsInt()
  user_id: number;

  @ApiProperty()
  @IsInt()
  workflow_instance_id: number;

  @ApiProperty({ type: [AggregatedInstanceShareActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregatedInstanceShareActionDto)
  shares: AggregatedInstanceShareActionDto[];
}
