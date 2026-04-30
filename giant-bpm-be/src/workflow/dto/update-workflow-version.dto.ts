import { ApiPropertyOptional } from '@nestjs/swagger';
import { RevisionState } from '../../common/types/common.types';
import {
  IsEnum,
  IsOptional,
  IsObject,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import type { FlowDefinition } from '../../flow-engine/types';

// Custom validator to ensure at least one field is provided
function IsAtLeastOneFieldProvided(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAtLeastOneFieldProvided',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as UpdateWorkflowVersionDto;
          return obj.status !== undefined || obj.flow_definition !== undefined;
        },
        defaultMessage() {
          return 'At least one field (status or flow_definition) must be provided';
        },
      },
    });
  };
}

export class UpdateWorkflowVersionDto {
  @ApiPropertyOptional({
    enum: RevisionState,
    description:
      'The status of the workflow revision. ' +
      'Note: At least one of status or flow_definition must be provided.',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(RevisionState)
  @IsAtLeastOneFieldProvided()
  status?: RevisionState;

  @ApiPropertyOptional({
    description:
      'The flow definition JSON of the workflow revision. ' +
      'Note: At least one of status or flow_definition must be provided.',
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
  @IsOptional()
  @IsObject()
  flow_definition?: FlowDefinition;
}
