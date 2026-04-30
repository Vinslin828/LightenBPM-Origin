import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import type { FlowDefinition } from '../../flow-engine/types';

/**
 * Request DTO for flow definition analysis APIs
 * Used for analyzing preceding nodes in a flow definition
 */
export class FlowAnalysisRequestDto {
  @ApiProperty({
    description: 'The flow definition to analyze',
  })
  @IsObject()
  flowDefinition: FlowDefinition;

  @ApiProperty({
    description: 'The key of the node to analyze from',
    example: 'approve_manager',
  })
  @IsString()
  nodeKey: string;
}
