import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for possible preceding nodes analysis
 * Returns all nodes that might be traversed before reaching the target node
 */
export class PossibleNodesResponseDto {
  @ApiProperty({
    description:
      'Array of node keys that might be traversed before reaching the target node (excludes START node). ' +
      'Includes nodes from ANY path, not just guaranteed paths.',
    type: [String],
    example: ['approve_team_lead', 'approve_manager', 'condition_check_amount'],
  })
  nodeKeys: string[];
}
