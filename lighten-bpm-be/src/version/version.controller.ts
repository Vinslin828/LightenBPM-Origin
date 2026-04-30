import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VersionService } from './version.service';
import { VersionDto } from './version.dto';

@Controller('version')
@ApiTags('System Version API')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @ApiOperation({ summary: 'Get application version information' })
  @ApiResponse({ status: 200, type: VersionDto })
  getVersionInfo(): VersionDto {
    return this.versionService.getVersionInfo();
  }
}
