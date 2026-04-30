import { ApiProperty } from '@nestjs/swagger';
import { ComponentMappingResponseDto } from './component-mapping-response.dto';

/**
 * Response DTO for listing component mappings bound to a validation rule
 */
export class ComponentsListResponseDto {
  @ApiProperty({
    description: 'Array of component mappings',
    type: [ComponentMappingResponseDto],
  })
  items: ComponentMappingResponseDto[];

  constructor(items: ComponentMappingResponseDto[]) {
    this.items = items;
  }
}
