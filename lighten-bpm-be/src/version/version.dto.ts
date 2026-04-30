import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VersionDto {
  @ApiProperty({ description: 'BPM Application version number' })
  version: number;

  @ApiProperty({
    description: 'Short Commit SHA of the application',
    example: 'a1b2c3d',
  })
  commitSha: string;

  @ApiProperty({
    description: 'Build date of the application',
    example: '2024-01-01T12:00:00Z',
  })
  buildDate: string;

  @ApiPropertyOptional({ description: 'Error message if any' })
  error?: string;
}
