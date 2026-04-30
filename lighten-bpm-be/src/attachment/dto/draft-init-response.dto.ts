import { ApiProperty } from '@nestjs/swagger';

export class DraftInitResponseDto {
  @ApiProperty({
    description: 'The generated draft ID for attachments',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  draft_id: string;
}
