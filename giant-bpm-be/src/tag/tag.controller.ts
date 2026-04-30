import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagDto } from './dto/tag.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user';

@ApiTags('Tag Management')
@UseGuards(AuthGuard)
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'The tag has been successfully created.',
    type: TagDto,
  })
  create(@Body() createTagDto: CreateTagDto, @CurrentUser() user: AuthUser) {
    return this.tagService.create(createTagDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({
    status: 200,
    description: 'Return all tags.',
    type: [TagDto],
  })
  findAll() {
    return this.tagService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a single tag.',
    type: TagDto,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully updated.',
    type: TagDto,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({
    status: 204,
    description: 'The tag has been successfully deleted.',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.tagService.remove(id);
  }
}
