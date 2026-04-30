import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNotEmpty,
  IsArray,
  IsNumber,
} from 'class-validator';
import { RevisionState } from '../../common/types/common.types';
import type { FlowDefinition } from 'src/flow-engine/types';

export class CreateWorkflowRevisionDto {
  @ApiProperty({
    description: 'The name of the workflow revision',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A brief description of the workflow revision',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The status of the workflow revision',
    enum: RevisionState,
    required: false,
    default: RevisionState.DRAFT,
  })
  @IsOptional()
  @IsEnum(RevisionState)
  status?: RevisionState;

  @ApiProperty({
    description: 'The flow definition JSON of the workflow revision',
    type: 'object',
    additionalProperties: true,
    example: {
      version: 1,
      nodes: [
        { key: 'start', type: 'start', next: 'end' },
        { key: 'end', type: 'end' },
      ],
    },
  })
  @IsNotEmpty()
  @IsObject()
  flow_definition: FlowDefinition;

  @ApiProperty({
    description: 'An array of tag IDs to associate with the workflow',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];
}
