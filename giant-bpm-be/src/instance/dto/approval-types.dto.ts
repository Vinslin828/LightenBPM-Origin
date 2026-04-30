import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InstanceStatus, NodeStatus } from '../../common/types/common.types';
import { RejectBehavior } from '../../flow-engine/types';

export enum ApprovalRequest {
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Runtime reject behaviors that can be specified in approval API
 * Excludes USER_SELECT as it's a design-time behavior only
 */
export type RuntimeRejectBehavior =
  | RejectBehavior.CLOSE_APPLICATION
  | RejectBehavior.RETURN_TO_APPLICANT
  | RejectBehavior.SEND_TO_SPECIFIC_NODE
  | RejectBehavior.BACK_TO_PREVIOUS_NODE;

export class ApprovalRequestDto {
  @ApiProperty({ description: 'The public id of approval task' })
  @IsString()
  approval_id!: string;

  @ApiProperty({
    description: 'The Approval/Reject Request to application',
    enum: ApprovalRequest,
  })
  @IsEnum(ApprovalRequest)
  approval_result!: ApprovalRequest;

  @ApiPropertyOptional({ description: 'comment' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Reject behavior selection. ONLY provide this field when node reject_config is user_select.\n\n' +
      'Usage rules:\n' +
      '- If node reject_config is user_select → REQUIRED (specify which option user selected)\n' +
      '- If node has specific reject_config (return_to_applicant, send_to_specific_node, etc.) → DO NOT provide (node config will be used)\n' +
      '- If node has no reject_config → DO NOT provide (defaults to close_application)\n\n' +
      'Available behaviors:\n' +
      '- close_application: End workflow immediately\n' +
      '- return_to_applicant: Return to applicant for editing\n' +
      '- send_to_specific_node: Send to specified node (requires reject_target_node_key)',
    enum: [
      RejectBehavior.CLOSE_APPLICATION,
      RejectBehavior.RETURN_TO_APPLICANT,
      RejectBehavior.SEND_TO_SPECIFIC_NODE,
    ],
    example: 'return_to_applicant',
  })
  @IsEnum(RejectBehavior)
  @IsOptional()
  reject_behavior?: RuntimeRejectBehavior;

  @ApiPropertyOptional({
    description:
      'Target node key for rejection. ONLY required when:\n' +
      '- Node reject_config is user_select AND user selects send_to_specific_node\n\n' +
      'DO NOT provide in other cases:\n' +
      '- Node reject_config is send_to_specific_node (target already configured in node)\n' +
      '- Other scenarios',
    example: 'approve_team_lead',
  })
  @IsString()
  @IsOptional()
  reject_target_node_key?: string;

  @ApiPropertyOptional({
    description:
      'Updated form data from the approver. ' +
      'Only fields marked as editable in the approval node component_rules will be applied.',
  })
  @IsOptional()
  form_data?: Record<string, any>;
}

export class ApprovalResponseDto {
  @ApiProperty({ description: 'Latest status of current node' })
  approval_node_status!: NodeStatus;

  @ApiProperty({ description: 'Latest status of current application' })
  application_status!: InstanceStatus;
}
