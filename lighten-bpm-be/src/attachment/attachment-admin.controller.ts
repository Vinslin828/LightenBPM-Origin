import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AttachmentService } from './attachment.service';
import { PendingUploadResponseDto } from './dto/pending-upload-response.dto';

@ApiTags('Attachment Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attachments/admin/pending')
export class AttachmentAdminController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Get()
  @ApiOperation({ summary: 'List expired/pending uploads (orphaned files)' })
  @ApiResponse({ status: 200, type: [PendingUploadResponseDto] })
  async listPendingUploads(): Promise<PendingUploadResponseDto[]> {
    return this.attachmentService.listExpiredAttachments();
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Purge a pending upload and delete the S3 object' })
  @ApiResponse({ status: 204 })
  async purgeAttachment(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attachmentService.purgeAttachment(id);
  }
}
