import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for selectable reject targets (runtime API)
 * Returns nodes that have actually been traversed in this application instance
 */
export class SelectableRejectTargetsResponseDto {
  @ApiProperty({
    description:
      'Array of node keys that have been traversed in this application instance and can be selected as reject targets. ' +
      'Excludes START node and the current node.',
    type: [String],
    example: ['approve_team_lead', 'condition_check_amount'],
  })
  nodeKeys: string[];
}
