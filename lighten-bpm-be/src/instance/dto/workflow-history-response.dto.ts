import { ApiProperty } from '@nestjs/swagger';
import { WorkflowHistoryDto } from './workflow-history.dto';

export class WorkflowHistoryResponseDto {
  @ApiProperty({ example: 'APP-0001' })
  serial_number: string;

  @ApiProperty({ type: [WorkflowHistoryDto] })
  history: Array<WorkflowHistoryDto>;
}
