/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import { ValidationRegistryRepository } from './repositories/validation-registry.repository';
import { ValidationComponentMappingRepository } from './repositories/validation-component-mapping.repository';
import { TransactionService } from '../prisma/transaction.service';
import {
  ValidationType,
  ValidationRegistry,
  ValidationComponentMapping,
} from '../common/types/common.types';

// Type for mock component mapping with validation relation
type ComponentMappingWithValidation = ValidationComponentMapping & {
  validation: { public_id: string };
};

describe('ValidationComponentMappingService', () => {
  let service: ValidationComponentMappingService;
  let validationRegistryRepository: jest.Mocked<ValidationRegistryRepository>;
  let componentMappingRepository: jest.Mocked<ValidationComponentMappingRepository>;
  let transactionService: jest.Mocked<TransactionService>;

  const mockValidation: ValidationRegistry = {
    id: 1,
    public_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'emailValidator',
    description: 'Validates email format',
    validation_type: ValidationType.CODE,
    validation_code: 'function validate(value) { return true; }',
    error_message: 'Invalid email',
    is_active: true,
    created_by: 1,
    updated_by: 1,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockValidationRegistryRepository = {
      findByPublicId: jest.fn(),
    };

    const mockComponentMappingRepository = {
      findByValidationId: jest.fn(),
      findByValidationIdAndComponentType: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteByValidationIdAndComponentType: jest.fn(),
      deleteAllByValidationId: jest.fn(),
      count: jest.fn(),
    };

    const mockTransactionService = {
      runTransaction: jest.fn(async (callback: (tx: null) => Promise<void>) =>
        callback(null),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationComponentMappingService,
        {
          provide: ValidationRegistryRepository,
          useValue: mockValidationRegistryRepository,
        },
        {
          provide: ValidationComponentMappingRepository,
          useValue: mockComponentMappingRepository,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile();

    service = module.get<ValidationComponentMappingService>(
      ValidationComponentMappingService,
    );
    validationRegistryRepository = module.get(ValidationRegistryRepository);
    componentMappingRepository = module.get(
      ValidationComponentMappingRepository,
    );
    transactionService = module.get(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setComponents', () => {
    const validationPublicId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 1;

    describe('when setting component bindings with smart diff', () => {
      it('should add new components and keep existing ones', async () => {
        // Arrange
        const dto = {
          components: ['TextField', 'EmailField', 'PasswordField'],
        };
        const existingMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
        ];
        const updatedMappings: ComponentMappingWithValidation[] = [
          ...existingMappings,
          {
            id: 3,
            public_id: 'mapping-3',
            validation_id: 1,
            component: 'PasswordField',
            created_by: 1,
            created_at: new Date('2024-01-02'),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce(existingMappings)
          .mockResolvedValueOnce(updatedMappings);
        componentMappingRepository.createMany.mockResolvedValue(1);

        // Act
        const result = await service.setComponents(
          validationPublicId,
          dto,
          userId,
        );

        // Assert
        expect(
          validationRegistryRepository.findByPublicId,
        ).toHaveBeenCalledWith(validationPublicId);
        expect(transactionService.runTransaction).toHaveBeenCalled();
        // Should not delete any existing components
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).not.toHaveBeenCalled();
        expect(componentMappingRepository.createMany).toHaveBeenCalledWith(
          [
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              public_id: expect.any(String),
              validation_id: 1,
              component: 'PasswordField',
              created_by: userId,
            },
          ],
          null,
        );
        expect(result.items).toHaveLength(3);
      });

      it('should remove components that are no longer in the list', async () => {
        // Arrange
        const dto = {
          components: ['TextField'],
        };
        const existingMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
        ];
        const updatedMappings: ComponentMappingWithValidation[] = [
          existingMappings[0],
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce(existingMappings)
          .mockResolvedValueOnce(updatedMappings);

        // Act
        await service.setComponents(validationPublicId, dto, userId);

        // Assert
        // Should delete EmailField
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).toHaveBeenCalledWith(1, 'EmailField', null);
        // Should not create any new components
        expect(componentMappingRepository.createMany).not.toHaveBeenCalled();
      });

      it('should handle adding and removing components simultaneously', async () => {
        // Arrange
        const dto = {
          components: ['TextField', 'PasswordField'],
        };
        const existingMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
        ];
        const updatedMappings: ComponentMappingWithValidation[] = [
          existingMappings[0],
          {
            id: 3,
            public_id: 'mapping-3',
            validation_id: 1,
            component: 'PasswordField',
            created_by: 1,
            created_at: new Date('2024-01-02'),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce(existingMappings)
          .mockResolvedValueOnce(updatedMappings);

        // Act
        await service.setComponents(validationPublicId, dto, userId);

        // Assert
        // Should delete EmailField
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).toHaveBeenCalledWith(1, 'EmailField', null);
        // Should add PasswordField
        expect(componentMappingRepository.createMany).toHaveBeenCalledWith(
          [
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              public_id: expect.any(String),
              validation_id: 1,
              component: 'PasswordField',
              created_by: userId,
            },
          ],
          null,
        );
      });

      it('should handle empty existing bindings', async () => {
        // Arrange
        const dto = {
          components: ['TextField', 'EmailField'],
        };
        const updatedMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date(),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date(),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(updatedMappings);

        // Act
        await service.setComponents(validationPublicId, dto, userId);

        // Assert
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).not.toHaveBeenCalled();
        expect(componentMappingRepository.createMany).toHaveBeenCalledWith(
          [
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              public_id: expect.any(String),
              validation_id: 1,
              component: 'TextField',
              created_by: userId,
            },
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              public_id: expect.any(String),
              validation_id: 1,
              component: 'EmailField',
              created_by: userId,
            },
          ],
          null,
        );
      });

      it('should handle no changes (idempotent)', async () => {
        // Arrange
        const dto = {
          components: ['TextField', 'EmailField'],
        };
        const existingMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce(existingMappings)
          .mockResolvedValueOnce(existingMappings);

        // Act
        await service.setComponents(validationPublicId, dto, userId);

        // Assert
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).not.toHaveBeenCalled();
        expect(componentMappingRepository.createMany).not.toHaveBeenCalled();
      });

      it('should use transaction for atomic operations', async () => {
        // Arrange
        const dto = { components: ['TextField'] };
        const existingMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date(),
            validation: { public_id: validationPublicId },
          },
        ];
        const updatedMappings: ComponentMappingWithValidation[] = [
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date(),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId
          .mockResolvedValueOnce(existingMappings)
          .mockResolvedValueOnce(updatedMappings);

        // Act
        await service.setComponents(validationPublicId, dto, userId);

        // Assert
        expect(transactionService.runTransaction).toHaveBeenCalledTimes(1);
        expect(transactionService.runTransaction).toHaveBeenCalledWith(
          expect.any(Function),
        );
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        const dto = { components: ['TextField'] };
        validationRegistryRepository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.setComponents(validationPublicId, dto, userId),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.setComponents(validationPublicId, dto, userId),
        ).rejects.toThrow(
          `Validation rule with ID "${validationPublicId}" not found`,
        );
        expect(transactionService.runTransaction).not.toHaveBeenCalled();
        expect(componentMappingRepository.createMany).not.toHaveBeenCalled();
      });
    });
  });

  describe('getComponents', () => {
    const validationPublicId = '550e8400-e29b-41d4-a716-446655440000';

    describe('when getting component bindings', () => {
      it('should return list of component mappings', async () => {
        // Arrange
        const mockMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId.mockResolvedValue(
          mockMappings,
        );

        // Act
        const result = await service.getComponents(validationPublicId);

        // Assert
        expect(
          validationRegistryRepository.findByPublicId,
        ).toHaveBeenCalledWith(validationPublicId);
        expect(
          componentMappingRepository.findByValidationId,
        ).toHaveBeenCalledWith(mockValidation.id);
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual(
          expect.objectContaining({
            id: 'mapping-1',
            validationId: validationPublicId,
            component: 'TextField',
            createdBy: 1,
          }),
        );
      });

      it('should return empty array when no bindings exist', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId.mockResolvedValue([]);

        // Act
        const result = await service.getComponents(validationPublicId);

        // Assert
        expect(result.items).toEqual([]);
        expect(result.items).toHaveLength(0);
      });

      it('should convert timestamps to epoch milliseconds', async () => {
        // Arrange
        const testDate = new Date('2024-01-01T00:00:00.000Z');
        const mockMappings: ComponentMappingWithValidation[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: testDate,
            validation: { public_id: validationPublicId },
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId.mockResolvedValue(
          mockMappings,
        );

        // Act
        const result = await service.getComponents(validationPublicId);

        // Assert
        expect(result.items[0].createdAt).toBe(testDate.getTime());
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getComponents(validationPublicId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.getComponents(validationPublicId)).rejects.toThrow(
          `Validation rule with ID "${validationPublicId}" not found`,
        );
        expect(
          componentMappingRepository.findByValidationId,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('getComponentTypes', () => {
    const validationPublicId = '550e8400-e29b-41d4-a716-446655440000';

    describe('when getting component types', () => {
      it('should return array of component type strings', async () => {
        // Arrange
        const mockMappings: ValidationComponentMapping[] = [
          {
            id: 1,
            public_id: 'mapping-1',
            validation_id: 1,
            component: 'TextField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 2,
            public_id: 'mapping-2',
            validation_id: 1,
            component: 'EmailField',
            created_by: 1,
            created_at: new Date('2024-01-01'),
          },
        ];

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId.mockResolvedValue(
          mockMappings,
        );

        // Act
        const result = await service.getComponentTypes(validationPublicId);

        // Assert
        expect(
          validationRegistryRepository.findByPublicId,
        ).toHaveBeenCalledWith(validationPublicId);
        expect(
          componentMappingRepository.findByValidationId,
        ).toHaveBeenCalledWith(mockValidation.id);
        expect(result).toEqual(['TextField', 'EmailField']);
      });

      it('should return empty array when no bindings exist', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.findByValidationId.mockResolvedValue([]);

        // Act
        const result = await service.getComponentTypes(validationPublicId);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('when validation rule does not exist', () => {
      it('should return empty array instead of throwing error', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(null);

        // Act
        const result = await service.getComponentTypes(validationPublicId);

        // Assert
        expect(result).toEqual([]);
        expect(
          componentMappingRepository.findByValidationId,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('removeComponent', () => {
    const validationPublicId = '550e8400-e29b-41d4-a716-446655440000';
    const componentType = 'TextField';

    describe('when removing a component binding', () => {
      it('should successfully remove the binding', async () => {
        // Arrange
        const mockMapping = {
          id: 1,
          public_id: 'mapping-1',
          validation_id: 1,
          component: componentType,
          created_by: 1,
          created_at: new Date(),
        };

        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.deleteByValidationIdAndComponentType.mockResolvedValue(
          mockMapping,
        );

        // Act
        await service.removeComponent(validationPublicId, componentType);

        // Assert
        expect(
          validationRegistryRepository.findByPublicId,
        ).toHaveBeenCalledWith(validationPublicId);
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).toHaveBeenCalledWith(mockValidation.id, componentType);
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.removeComponent(validationPublicId, componentType),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.removeComponent(validationPublicId, componentType),
        ).rejects.toThrow(
          `Validation rule with ID "${validationPublicId}" not found`,
        );
        expect(
          componentMappingRepository.deleteByValidationIdAndComponentType,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when component binding does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        validationRegistryRepository.findByPublicId.mockResolvedValue(
          mockValidation,
        );
        componentMappingRepository.deleteByValidationIdAndComponentType.mockResolvedValue(
          null,
        );

        // Act & Assert
        await expect(
          service.removeComponent(validationPublicId, componentType),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.removeComponent(validationPublicId, componentType),
        ).rejects.toThrow(
          `Component binding "${componentType}" not found for validation rule "${validationPublicId}"`,
        );
      });
    });
  });
});
