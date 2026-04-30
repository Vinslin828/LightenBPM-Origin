import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { AttachmentService } from './attachment.service';
import { PresignUploadRequestDto } from './dto/presign-upload-request.dto';
import { PresignUploadResponseDto } from './dto/presign-upload-response.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { DraftInitResponseDto } from './dto/draft-init-response.dto';

@ApiTags('Draft Attachment Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attachments/drafts')
export class DraftAttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('init')
  @ApiOperation({ summary: 'Initialize a new draft for attachments' })
  @ApiResponse({ status: 201, type: DraftInitResponseDto })
  initDraft(): DraftInitResponseDto {
    return this.attachmentService.initDraft();
  }

  @Post(':draft_id/presign-upload')
  @ApiOperation({
    summary: 'Get a presigned S3 URL for uploading a file to a draft',
  })
  @ApiResponse({ status: 201, type: PresignUploadResponseDto })
  async presignDraftUpload(
    @CurrentUser() user: AuthUser,
    @Param('draft_id') draftId: string,
    @Body() dto: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    return this.attachmentService.presignDraftUpload(
      draftId,
      user.id,
      user.code,
      dto,
    );
  }

  @Post(':draft_id/confirm')
  @ApiOperation({
    summary: 'Confirm file has been uploaded to S3 for a draft',
  })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  async confirmDraftUpload(
    @CurrentUser() user: AuthUser,
    @Param('draft_id') draftId: string,
    @Body() dto: ConfirmUploadDto,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentService.confirmDraftUpload(draftId, user.id, dto);
  }

  @Get(':draft_id')
  @ApiOperation({ summary: 'List all attachments for the specific draft' })
  @ApiResponse({ status: 200, type: [AttachmentResponseDto] })
  async listDraftAttachments(
    @CurrentUser() user: AuthUser,
    @Param('draft_id') draftId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentService.listDraftAttachments(draftId, user.id);
  }

  @Delete(':draft_id/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a draft attachment' })
  @ApiResponse({ status: 204 })
  async deleteDraftAttachment(
    @CurrentUser() user: AuthUser,
    @Param('draft_id') draftId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.attachmentService.deleteDraftAttachment(draftId, user.id, id);
  }
}
