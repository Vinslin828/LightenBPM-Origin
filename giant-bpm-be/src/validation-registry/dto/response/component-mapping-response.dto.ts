import { ApiProperty } from '@nestjs/swagger';
import { ValidationComponentMapping } from '../../../common/types/common.types';

/**
 * Response DTO for component mapping
 */
export class ComponentMappingResponseDto {
  @ApiProperty({
    description: 'The unique identifier (UUID)',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The validation rule ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  validationId: string;

  @ApiProperty({
    description: 'The component type',
    example: 'TextField',
  })
  component: string;

  @ApiProperty({
    description: 'The ID of the user who created this mapping',
    example: 1,
  })
  createdBy: number;

  @ApiProperty({
    description:
      'The timestamp when the mapping was created (epoch milliseconds)',
    example: 1704096000000,
  })
  createdAt: number;

  constructor(data: Partial<ComponentMappingResponseDto>) {
    Object.assign(this, data);
  }

  /**
   * Convert Prisma model to DTO
   */
  static fromPrisma(
    mapping: ValidationComponentMapping & {
      validation: { public_id: string };
    },
  ): ComponentMappingResponseDto {
    return new ComponentMappingResponseDto({
      id: mapping.public_id,
      validationId: mapping.validation.public_id,
      component: mapping.component,
      createdBy: mapping.created_by,
      createdAt: mapping.created_at.getTime(),
    });
  }
}
