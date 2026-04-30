import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateValidationRegistryDto } from './dto/request/create-validation-registry.dto';
import { PatchValidationRegistryDto } from './dto/request/patch-validation-registry.dto';
import { ValidationRegistryResponseDto } from './dto/response/validation-registry-response.dto';
import { ValidationRegistryRepository } from './repositories/validation-registry.repository';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import {
  PaginatedResponseDto,
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
} from '../common/dto/pagination.dto';
import { ValidationType } from '../common/types/common.types';
import { generatePublicId } from '../common/utils/id-generator';
import { Prisma } from '@prisma/client';
import { validateValidationExpression } from '../flow-engine/expression-engine';

@Injectable()
export class ValidationRegistryService {
  constructor(
    private readonly validationRegistryRepository: ValidationRegistryRepository,
    private readonly componentMappingService: ValidationComponentMappingService,
  ) {}

  async create(
    dto: CreateValidationRegistryDto,
    userId: number,
  ): Promise<ValidationRegistryResponseDto> {
    // Check if name already exists
    const existing = await this.validationRegistryRepository.findByName(
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        `Validation rule with name "${dto.name}" already exists`,
      );
    }

    // Validate validationCode if provided (must return boolean or {isValid, error})
    if (dto.validationCode) {
      const validationResult = await validateValidationExpression(
        dto.validationCode,
      );
      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Invalid validationCode: ${validationResult.errors[0]?.message}`,
        );
      }
    }

    const validation = await this.validationRegistryRepository.create({
      public_id: generatePublicId(),
      name: dto.name,
      description: dto.description,
      validation_type: dto.validationType,
      validation_code: dto.validationCode,
      error_message: dto.errorMessage,
      is_active: dto.isActive ?? true,
      created_by: userId,
      updated_by: userId,
    });

    // Set component bindings if provided
    if (dto.components && dto.components.length > 0) {
      await this.componentMappingService.setComponents(
        validation.public_id,
        { components: dto.components },
        userId,
      );
    }

    // Get component types for response
    const components = await this.componentMappingService.getComponentTypes(
      validation.public_id,
    );

    return ValidationRegistryResponseDto.fromPrisma(validation, components);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    validationType?: ValidationType;
    component?: string;
    name?: string;
  }): Promise<PaginatedResponseDto<ValidationRegistryResponseDto>> {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_PAGINATION_LIMIT,
      isActive,
      validationType,
      component,
      name,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ValidationRegistryWhereInput = {};
    if (isActive !== undefined) {
      where.is_active = isActive;
    }
    if (validationType) {
      where.validation_type = validationType;
    }
    if (component) {
      where.components = {
        some: {
          component: component,
        },
      };
    }
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    const [validations, total] = await Promise.all([
      this.validationRegistryRepository.findAll({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.validationRegistryRepository.count(where),
    ]);

    // Get components for all validations
    const items = await Promise.all(
      validations.map(async (v) => {
        const components = await this.componentMappingService.getComponentTypes(
          v.public_id,
        );
        return ValidationRegistryResponseDto.fromPrisma(v, components);
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(publicId: string): Promise<ValidationRegistryResponseDto> {
    const validation =
      await this.validationRegistryRepository.findByPublicId(publicId);

    if (!validation) {
      throw new NotFoundException(
        `Validation rule with ID "${publicId}" not found`,
      );
    }

    // Get component types for response
    const components =
      await this.componentMappingService.getComponentTypes(publicId);

    return ValidationRegistryResponseDto.fromPrisma(validation, components);
  }

  async update(
    publicId: string,
    dto: PatchValidationRegistryDto,
    userId: number,
  ): Promise<ValidationRegistryResponseDto> {
    // Check if exists
    const existing =
      await this.validationRegistryRepository.findByPublicId(publicId);
    if (!existing) {
      throw new NotFoundException(
        `Validation rule with ID "${publicId}" not found`,
      );
    }

    // Check if name is being changed and if new name already exists
    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.validationRegistryRepository.findByName(
        dto.name,
      );
      if (nameExists) {
        throw new ConflictException(
          `Validation rule with name "${dto.name}" already exists`,
        );
      }
    }

    // Validate validationCode if provided (must return boolean or {isValid, error})
    if (dto.validationCode) {
      const validationResult = await validateValidationExpression(
        dto.validationCode,
      );
      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Invalid validationCode: ${validationResult.errors[0]?.message}`,
        );
      }
    }

    const updated = await this.validationRegistryRepository.update(publicId, {
      name: dto.name,
      description: dto.description,
      validation_type: dto.validationType,
      validation_code: dto.validationCode,
      error_message: dto.errorMessage,
      is_active: dto.isActive,
      updated_by: userId,
    });

    // Set component bindings if provided
    // undefined = don't change, [] = clear all, ['A', 'B'] = set to ['A', 'B']
    if (dto.components !== undefined) {
      await this.componentMappingService.setComponents(
        publicId,
        { components: dto.components },
        userId,
      );
    }

    // Get component types for response
    const components =
      await this.componentMappingService.getComponentTypes(publicId);

    return ValidationRegistryResponseDto.fromPrisma(updated, components);
  }

  async remove(publicId: string): Promise<void> {
    const existing =
      await this.validationRegistryRepository.findByPublicId(publicId);
    if (!existing) {
      throw new NotFoundException(
        `Validation rule with ID "${publicId}" not found`,
      );
    }

    await this.validationRegistryRepository.delete(publicId);
  }
}
