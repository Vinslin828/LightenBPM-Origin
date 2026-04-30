import { ApiProperty } from '@nestjs/swagger';
import { WorkflowNodeDto } from './workflow-node.dto';
import { InstanceStatus } from '../../common/types/common.types';

export class ApplicationNodesDto {
  @ApiProperty({
    description: 'The serial number of the application instance',
  })
  serial_number: string;

  @ApiProperty({
    description: 'The UUID of the workflow instance',
    format: 'uuid',
  })
  workflow_instance_id: string;

  @ApiProperty({
    description: 'The status of the workflow instance',
  })
  workflow_instance_status: InstanceStatus;

  @ApiProperty({
    description: 'The workflow nodes associated with the application instance',
    type: () => [WorkflowNodeDto],
  })
  workflowNodes: WorkflowNodeDto[];

  constructor(data: Partial<ApplicationNodesDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(
    serial_number: string,
    workflow_instance_id: string,
    workflow_instance_status: InstanceStatus,
    nodes: WorkflowNodeDto[],
  ): ApplicationNodesDto {
    return new ApplicationNodesDto({
      serial_number,
      workflow_instance_id,
      workflow_instance_status,
      workflowNodes: nodes,
    });
  }
}
