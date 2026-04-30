import { ApiProperty } from '@nestjs/swagger';
import { sampleRouting } from './flow-routing.dto';
import * as FlowEngineTypes from '../../flow-engine/types';
import { InstanceStatus } from '../../common/types/common.types';
import { IsEnum } from 'class-validator';

export class ApplicationRoutingResponseDto {
  @ApiProperty({
    description: 'The application serail number',
  })
  serial_number: string;

  @ApiProperty({
    description: 'The overall status of the application',
    enum: InstanceStatus,
  })
  @IsEnum(InstanceStatus)
  overall_status: InstanceStatus;

  @ApiProperty({
    description: 'workflow routing',
    example: sampleRouting,
  })
  routing?: FlowEngineTypes.FlowRouting;
}
