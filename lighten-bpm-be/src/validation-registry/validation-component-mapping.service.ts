import { Injectable, NotFoundException } from '@nestjs/common';
import { generatePublicId } from '../common/utils/id-generator';
import { ValidationRegistryRepository } from './repositories/validation-registry.repository';
import { ValidationComponentMappingRepository } from './repositories/validation-component-mapping.repository';
import { ComponentsListResponseDto } from './dto/response/components-list-response.dto';
import { ComponentMappingResponseDto } from './dto/response/component-mapping-response.dto';
import { PutComponentsDto } from './dto/request/put-components.dto';
import { TransactionService } from '../prisma/transaction.service';

@Injectable()
export class ValidationComponentMappingService {
  constructor(
    private readonly validationRegistryRepository: ValidationRegistryRepository,
    private readonly componentMappingRepository: ValidationComponentMappingRepository,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Set component bindings for a validation rule
   * Uses smart diff to only add/remove changed bindings
   */
  async setComponents(
    validationPublicId: string,
    dto: PutComponentsDto,
    userId: number,
  ): Promise<ComponentsListResponseDto> {
    // Check if validation exists
    const validation =
      await this.validationRegistryRepository.findByPublicId(
        validationPublicId,
      );
    if (!validation) {
      throw new NotFoundException(
        `Validation rule with ID "${validationPublicId}" not found`,
      );
    }

    // Get existing bindings
    const existingMappings =
      await this.componentMappingRepository.findByValidationId(validation.id);
    const existingTypes = existingMappings.map((m) => m.component);

    // Calculate diff
    const toAdd = dto.components.filter((c) => !existingTypes.includes(c));
    const toRemove = existingTypes.filter((c) => !dto.components.includes(c));

    // Update bindings in a transaction
    await this.transactionService.runTransaction(async (tx) => {
      // Remove components that are no longer in the list
      for (const component of toRemove) {
        await this.componentMappingRepository.deleteByValidationIdAndComponentType(
          validation.id,
          component,
          tx,
        );
      }

      // Add new components
      if (toAdd.length > 0) {
        const mappings = toAdd.map((component) => ({
          public_id: generatePublicId(),
          validation_id: validation.id,
          component: component,
          created_by: userId,
        }));

        await this.componentMappingRepository.createMany(mappings, tx);
      }
    });

    // Get updated bindings to return
    const updatedMappings =
      await this.componentMappingRepository.findByValidationId(validation.id);

    const items = updatedMappings.map((mapping) =>
      ComponentMappingResponseDto.fromPrisma(mapping),
    );

    return new ComponentsListResponseDto(items);
  }

  /**
   * Get component bindings for a validation rule
   */
  async getComponents(
    validationPublicId: string,
  ): Promise<ComponentsListResponseDto> {
    // Check if validation exists
    const validation =
      await this.validationRegistryRepository.findByPublicId(
        validationPublicId,
      );
    if (!validation) {
      throw new NotFoundException(
        `Validation rule with ID "${validationPublicId}" not found`,
      );
    }

    // Get all component bindings
    const mappings = await this.componentMappingRepository.findByValidationId(
      validation.id,
    );

    const items = mappings.map((mapping) =>
      ComponentMappingResponseDto.fromPrisma(mapping),
    );

    return new ComponentsListResponseDto(items);
  }

  /**
   * Get component types (as string array)
   * This is a lightweight version of getComponents() for internal use
   */
  async getComponentTypes(validationPublicId: string): Promise<string[]> {
    // Check if validation exists
    const validation =
      await this.validationRegistryRepository.findByPublicId(
        validationPublicId,
      );
    if (!validation) {
      return []; // Return empty array if validation doesn't exist
    }

    // Get all component bindings
    const mappings = await this.componentMappingRepository.findByValidationId(
      validation.id,
    );

    return mappings.map((m) => m.component);
  }

  /**
   * Remove a specific component binding
   */
  async removeComponent(
    validationPublicId: string,
    component: string,
  ): Promise<void> {
    // Check if validation exists
    const validation =
      await this.validationRegistryRepository.findByPublicId(
        validationPublicId,
      );
    if (!validation) {
      throw new NotFoundException(
        `Validation rule with ID "${validationPublicId}" not found`,
      );
    }

    // Delete the specific binding
    const deleted =
      await this.componentMappingRepository.deleteByValidationIdAndComponentType(
        validation.id,
        component,
      );

    if (!deleted) {
      throw new NotFoundException(
        `Component binding "${component}" not found for validation rule "${validationPublicId}"`,
      );
    }
  }
}
