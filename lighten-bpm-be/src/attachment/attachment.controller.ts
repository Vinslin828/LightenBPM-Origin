import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { DownloadResponseDto } from './dto/download-response.dto';

@ApiTags('Attachment Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('applications/:serial_number/attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('presign-upload')
  @ApiOperation({
    summary: 'Get a presigned S3 URL for uploading a file directly',
  })
  @ApiResponse({ status: 201, type: PresignUploadResponseDto })
  async presignUpload(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Body() dto: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    return this.attachmentService.presignUpload(
      serialNumber,
      user.id,
      user.code,
      dto,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Confirm file has been uploaded to S3 and register it internally',
  })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  async confirmUpload(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Body() dto: ConfirmUploadDto,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentService.confirmUpload(serialNumber, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all attachments for the specific application',
  })
  @ApiResponse({ status: 200, type: [AttachmentResponseDto] })
  async listAttachments(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Query('field_key') fieldKey?: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentService.listAttachments(serialNumber, user, fieldKey);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Get a presigned S3 URL to download a file securely',
  })
  @ApiResponse({ status: 200, type: DownloadResponseDto })
  async presignDownload(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DownloadResponseDto> {
    return this.attachmentService.presignDownload(serialNumber, user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attachment remark' })
  @ApiResponse({ status: 200, type: AttachmentResponseDto })
  async updateAttachment(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentService.updateRemark(serialNumber, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiResponse({ status: 204 })
  async deleteAttachment(
    @CurrentUser() user: AuthUser,
    @Param('serial_number') serialNumber: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.attachmentService.deleteAttachment(serialNumber, user.id, id);
  }
}
