import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'User name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Job grade level', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  jobGrade?: number;

  @ApiProperty({
    required: false,
    description: 'Default organization unit id',
  })
  @IsOptional()
  @IsInt()
  defaultOrgId?: number;

  @ApiProperty({
    required: false,
    description: 'Default organization unit Code',
  })
  @IsOptional()
  @IsString()
  defaultOrgCode?: string;
}
