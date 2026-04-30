import {
  Controller,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { MigrationService } from './migration.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';
import type {
  ExportContainer,
  ImportCheckResponse,
  ImportExecuteResponse,
} from './types/migration.types';
import { ImportExecuteResponseDto } from './dto/import-execute-response.dto';
import { BulkImportDto } from './dto/bulk-import.dto';

@ApiTags('Migration')
@Controller()
@UseGuards(AuthGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('import/check')
  @ApiOperation({ summary: 'Check an export payload before importing' })
  async checkImport(
    @Body() payload: ExportContainer<any>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('User has no permission to import!');
    }
    return this.migrationService.checkImport(payload);
  }

  @Post('import/execute')
  @ApiOperation({ summary: 'Execute the import of a form or workflow' })
  @ApiResponse({
    status: 201,
    description: 'The import was successfully executed',
    type: ImportExecuteResponseDto,
  })
  async executeImport(
    @Body() checkResult: ImportCheckResponse,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportExecuteResponse> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('User has no permission to import!');
    }
    return this.migrationService.executeImport(checkResult, user.id);
  }

  @Post('import/bulk')
  @ApiOperation({
    summary: 'Bulk import users, org units and memberships',
    description:
      'Bulk import users, org units and memberships from external systems.',
  })
  async bulkImport(@Body() dto: BulkImportDto, @CurrentUser() user: AuthUser) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('User has no permission to bulk import!');
    }
    return this.migrationService.bulkImport(dto, user.id);
  }
}
