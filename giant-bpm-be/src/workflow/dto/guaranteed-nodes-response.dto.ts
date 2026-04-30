import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for guaranteed preceding nodes API
 * Returns nodes that will definitely be traversed before reaching the target node
 */
export class GuaranteedNodesResponseDto {
  @ApiProperty({
    description:
      'Array of node keys that are guaranteed to be traversed before reaching the target node (excludes START node)',
    type: [String],
    example: ['approve_team_lead', 'condition_check_amount'],
  })
  nodeKeys: string[];
}
