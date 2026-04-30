import { ApiProperty } from '@nestjs/swagger';

export class DuplicateMatchDto {
  @ApiProperty({ example: 'APP-1768459691940' })
  serialNumber: string;

  @ApiProperty({ example: 5 })
  applicantId: number;

  @ApiProperty({ example: 'John Doe' })
  applicantName: string;

  @ApiProperty({ example: 'RUNNING' })
  status: string;

  @ApiProperty({ example: 1700000000000 })
  submittedAt: number;

  constructor(partial: Partial<DuplicateMatchDto>) {
    Object.assign(this, partial);
  }
}

export class DuplicateCheckResponseDto {
  @ApiProperty({ example: true })
  isDuplicate: boolean;

  @ApiProperty({ type: [DuplicateMatchDto] })
  matches: DuplicateMatchDto[];

  constructor(matches: DuplicateMatchDto[]) {
    this.matches = matches;
    this.isDuplicate = matches.length > 0;
  }
}
