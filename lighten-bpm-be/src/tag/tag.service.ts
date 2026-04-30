import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagDto } from './dto/tag.dto';
import { TagRepository } from './repositories/tag.repository';

@Injectable()
export class TagService {
  constructor(private readonly tagRepository: TagRepository) {}

  async create(createTagDto: CreateTagDto, userId: number): Promise<TagDto> {
    const tag = await this.tagRepository.create({
      ...createTagDto,
      created_by: userId,
      updated_by: userId,
    });
    return TagDto.fromPrisma(tag);
  }

  async findAll(): Promise<TagDto[]> {
    const tags = await this.tagRepository.findAll();
    return tags.map((tag) => TagDto.fromPrisma(tag));
  }

  async findOne(id: number): Promise<TagDto | null> {
    const tag = await this.tagRepository.findById(id);
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    return TagDto.fromPrisma(tag);
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<TagDto> {
    const updatedTag = await this.tagRepository.update(id, updateTagDto);
    return TagDto.fromPrisma(updatedTag);
  }

  async remove(id: number): Promise<void> {
    await this.tagRepository.delete(id);
  }
}
