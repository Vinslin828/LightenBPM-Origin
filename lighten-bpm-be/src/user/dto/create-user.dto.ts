import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User Code (External ID)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Cognito sub', required: false, nullable: true })
  @IsOptional()
  @IsString()
  sub?: string;

  @ApiProperty({ description: 'User email', required: false, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Job grade level', minimum: 1 })
  @IsNumber()
  @Min(1)
  jobGrade: number;

  @ApiProperty({ description: 'Default organization unit Code' })
  @IsString()
  defaultOrgCode: string;
}
