import { ApiProperty } from '@nestjs/swagger';
import {
  User,
  WorkflowComment,
  ApprovalTask,
} from '../../common/types/common.types';
import { UserDto } from '../../user/dto/user.dto';

export class WorkflowCommentDto {
  @ApiProperty({
    description: 'The content of the workflow comment',
  })
  content: string;

  @ApiProperty({
    description: 'The UUID of the approval task associated with the comment',
  })
  approval_task_id: string;

  @ApiProperty({
    description: 'The creation timestamp of the comment',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp of the comment',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'The author of the comment',
  })
  author: UserDto;

  constructor(data: Partial<WorkflowCommentDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(
    comment: WorkflowComment,
    approval_task: ApprovalTask,
    author: User,
  ): WorkflowCommentDto {
    return new WorkflowCommentDto({
      content: comment.text,
      approval_task_id: approval_task.public_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: UserDto.fromPrisma(author),
    });
  }
}
