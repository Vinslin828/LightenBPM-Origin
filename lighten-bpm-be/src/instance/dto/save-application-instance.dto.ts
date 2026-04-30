import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SaveApplicationInstanceDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  form_data: any;
}
