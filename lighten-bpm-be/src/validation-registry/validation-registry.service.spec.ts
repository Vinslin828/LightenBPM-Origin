/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ValidationRegistryService } from './validation-registry.service';
import { ValidationRegistryRepository } from './repositories/validation-registry.repository';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import {
  ValidationType,
  ValidationRegistry,
} from '../common/types/common.types';

describe('ValidationRegistryService', () => {
  let service: ValidationRegistryService;
  let repository: jest.Mocked<ValidationRegistryRepository>;
  let componentMappingService: jest.Mocked<ValidationComponentMappingService>;

  const mockValidationRegistry: ValidationRegistry = {
    id: 1,
    public_id: 'LmockId123456',
    name: 'emailValidator',
    description: 'Validates email format',
    validation_type: ValidationType.CODE,
    validation_code:
      'function validate(value) { return /\\S+@\\S+\\.\\S+/.test(value); }',
    error_message: 'Invalid email format',
    is_active: true,
    created_by: 1,
    updated_by: 1,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findByPublicId: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockComponentMappingService = {
      setComponents: jest.fn(),
      getComponents: jest.fn(),
      getComponentTypes: jest.fn(),
      removeComponent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationRegistryService,
        {
          provide: ValidationRegistryRepository,
          useValue: mockRepository,
        },
        {
          provide: ValidationComponentMappingService,
          useValue: mockComponentMappingService,
        },
      ],
    }).compile();

    service = module.get<ValidationRegistryService>(ValidationRegistryService);
    repository = module.get(ValidationRegistryRepository);
    componentMappingService = module.get(ValidationComponentMappingService);

    // Default mock for getComponentTypes (returns empty array)
    componentMappingService.getComponentTypes.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 1;

    describe('when creating a validation rule with valid data', () => {
      it('should successfully create a CODE type validation rule', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          description: 'Validates email format',
          validationType: ValidationType.CODE,
          validationCode: 'function validate(value) { return true; }',
          errorMessage: 'Invalid email',
          isActive: true,
        };

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(mockValidationRegistry);

        // Act
        const result = await service.create(createDto, userId);

        // Assert
        expect(repository.findByName).toHaveBeenCalledWith(createDto.name);
        expect(repository.create).toHaveBeenCalledWith({
          public_id: expect.any(String),
          name: createDto.name,
          description: createDto.description,
          validation_type: createDto.validationType,
          validation_code: createDto.validationCode,
          error_message: createDto.errorMessage,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        });
        expect(result).toEqual(
          expect.objectContaining({
            id: mockValidationRegistry.public_id,
            name: mockValidationRegistry.name,
            description: mockValidationRegistry.description,
            validationType: mockValidationRegistry.validation_type,
            validationCode: mockValidationRegistry.validation_code,
            errorMessage: mockValidationRegistry.error_message,
            isActive: mockValidationRegistry.is_active,
            createdBy: mockValidationRegistry.created_by,
            updatedBy: mockValidationRegistry.updated_by,
            createdAt: mockValidationRegistry.created_at.getTime(),
            updatedAt: mockValidationRegistry.updated_at.getTime(),
          }),
        );
      });

      it('should default isActive to true when not provided', async () => {
        // Arrange
        const createDto = {
          name: 'testValidator',
        };

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.create(createDto, userId);

        // Assert
        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            is_active: true,
          }),
        );
      });
    });

    describe('when name already exists', () => {
      it('should throw ConflictException', async () => {
        // Arrange
        const createDto = {
          name: 'existingValidator',
        };

        repository.findByName.mockResolvedValue(mockValidationRegistry);

        // Act & Assert
        await expect(service.create(createDto, userId)).rejects.toThrow(
          ConflictException,
        );
        await expect(service.create(createDto, userId)).rejects.toThrow(
          'Validation rule with name "existingValidator" already exists',
        );
        expect(repository.create).not.toHaveBeenCalled();
      });
    });

    describe('component bindings', () => {
      it('should set component bindings when components are provided', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          validationType: ValidationType.CODE,
          validationCode: 'true',
          components: ['TextField', 'EmailField'],
        };

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(mockValidationRegistry);
        componentMappingService.setComponents.mockResolvedValue({
          items: [],
        });
        componentMappingService.getComponentTypes.mockResolvedValue([
          'TextField',
          'EmailField',
        ]);

        // Act
        const result = await service.create(createDto, userId);

        // Assert
        expect(componentMappingService.setComponents).toHaveBeenCalledWith(
          mockValidationRegistry.public_id,
          { components: ['TextField', 'EmailField'] },
          userId,
        );
        expect(result.components).toEqual(['TextField', 'EmailField']);
      });

      it('should not set component bindings when components are not provided', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          validationType: ValidationType.CODE,
          validationCode: 'true',
        };

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.create(createDto, userId);

        // Assert
        expect(componentMappingService.setComponents).not.toHaveBeenCalled();
      });

      it('should not set component bindings when components array is empty', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          validationType: ValidationType.CODE,
          validationCode: 'true',
          components: [],
        };

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.create(createDto, userId);

        // Assert
        expect(componentMappingService.setComponents).not.toHaveBeenCalled();
      });
    });
  });

  describe('findAll', () => {
    const mockValidations: ValidationRegistry[] = [
      mockValidationRegistry,
      {
        ...mockValidationRegistry,
        id: 2,
        public_id: 'LmockId123457',
        name: 'phoneValidator',
        is_active: false,
      },
    ];

    describe('when fetching with default pagination', () => {
      it('should return paginated results with default values', async () => {
        // Arrange
        repository.findAll.mockResolvedValue(mockValidations);
        repository.count.mockResolvedValue(2);

        // Act
        const result = await service.findAll({});

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith({
          skip: 0,
          take: 10,
          where: {},
          orderBy: { created_at: 'desc' },
        });
        expect(result).toEqual({
          items: expect.arrayContaining([
            expect.objectContaining({ name: 'emailValidator' }),
            expect.objectContaining({ name: 'phoneValidator' }),
          ]),
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        });
      });
    });

    describe('when fetching with custom pagination', () => {
      it('should apply correct skip and take values', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(25);

        // Act
        const result = await service.findAll({ page: 3, limit: 5 });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10, // (3 - 1) * 5
            take: 5,
          }),
        );
        expect(result.totalPages).toBe(5); // Math.ceil(25 / 5)
      });
    });

    describe('when applying filters', () => {
      it('should filter by isActive', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[1]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({ isActive: false });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { is_active: false },
          }),
        );
      });

      it('should filter by validationType', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({ validationType: ValidationType.CODE });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { validation_type: ValidationType.CODE },
          }),
        );
      });

      it('should filter by component', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({ component: 'TextField' });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              components: {
                some: {
                  component: 'TextField',
                },
              },
            },
          }),
        );
      });

      it('should filter by name (partial match, case-insensitive)', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({ name: 'email' });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              name: {
                contains: 'email',
                mode: 'insensitive',
              },
            },
          }),
        );
      });

      it('should apply multiple filters simultaneously', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({
          isActive: true,
          validationType: ValidationType.CODE,
        });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              is_active: true,
              validation_type: ValidationType.CODE,
            },
          }),
        );
      });

      it('should combine component filter with other filters', async () => {
        // Arrange
        repository.findAll.mockResolvedValue([mockValidations[0]]);
        repository.count.mockResolvedValue(1);

        // Act
        await service.findAll({
          component: 'TextField',
          isActive: true,
          validationType: ValidationType.CODE,
        });

        // Assert
        expect(repository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              components: {
                some: {
                  component: 'TextField',
                },
              },
              is_active: true,
              validation_type: ValidationType.CODE,
            },
          }),
        );
      });
    });
  });

  describe('findOne', () => {
    const publicId = 'LmockId123456';

    describe('when validation rule exists', () => {
      it('should return the validation rule', async () => {
        // Arrange
        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);

        // Act
        const result = await service.findOne(publicId);

        // Assert
        expect(repository.findByPublicId).toHaveBeenCalledWith(publicId);
        expect(result).toEqual(
          expect.objectContaining({
            id: publicId,
            name: 'emailValidator',
          }),
        );
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        repository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(service.findOne(publicId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findOne(publicId)).rejects.toThrow(
          `Validation rule with ID "${publicId}" not found`,
        );
      });
    });
  });

  describe('update', () => {
    const publicId = 'LmockId123456';
    const userId = 1;

    describe('when updating with valid data', () => {
      it('should successfully update fields', async () => {
        // Arrange
        const updateDto = {
          name: 'updatedValidator',
          description: 'Updated description',
          validationType: ValidationType.CODE,
          validationCode: 'true',
          errorMessage: 'Updated error',
          isActive: false,
        };
        const updatedValidation = {
          ...mockValidationRegistry,
          name: updateDto.name,
          description: updateDto.description,
          validation_type: updateDto.validationType,
          validation_code: updateDto.validationCode,
          error_message: updateDto.errorMessage,
          is_active: updateDto.isActive,
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.findByName.mockResolvedValue(null);
        repository.update.mockResolvedValue(updatedValidation);

        // Act
        const result = await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.findByPublicId).toHaveBeenCalledWith(publicId);
        expect(repository.findByName).toHaveBeenCalledWith(updateDto.name);
        expect(repository.update).toHaveBeenCalledWith(publicId, {
          name: updateDto.name,
          description: updateDto.description,
          validation_type: updateDto.validationType,
          validation_code: updateDto.validationCode,
          error_message: updateDto.errorMessage,
          is_active: updateDto.isActive,
          updated_by: userId,
        });
        expect(result.name).toBe(updateDto.name);
      });

      it('should successfully update only description (partial update)', async () => {
        // Arrange
        const updateDto = {
          description: 'Only updating description',
        };
        const updatedValidation = {
          ...mockValidationRegistry,
          description: updateDto.description,
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(updatedValidation);

        // Act
        const result = await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.update).toHaveBeenCalledWith(
          publicId,
          expect.objectContaining({
            description: updateDto.description,
            name: undefined,
            validation_type: undefined,
          }),
        );
        expect(result.description).toBe(updateDto.description);
      });

      it('should successfully update only isActive (partial update)', async () => {
        // Arrange
        const updateDto = {
          isActive: false,
        };
        const updatedValidation = {
          ...mockValidationRegistry,
          is_active: false,
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(updatedValidation);

        // Act
        const result = await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.update).toHaveBeenCalledWith(
          publicId,
          expect.objectContaining({
            is_active: false,
            name: undefined,
            description: undefined,
          }),
        );
        expect(result.isActive).toBe(false);
      });

      it('should allow updating with the same name', async () => {
        // Arrange
        const updateDto = {
          name: 'emailValidator', // Same as current name
          description: 'Updated description',
        };
        const updatedValidation = {
          ...mockValidationRegistry,
          description: updateDto.description,
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(updatedValidation);

        // Act
        await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.findByName).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenCalled();
      });
    });

    describe('when no valid fields are provided', () => {
      it('should still call update even with empty DTO (validation happens at controller level)', async () => {
        // Arrange
        const updateDto = {};

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.update).toHaveBeenCalledWith(
          publicId,
          expect.objectContaining({
            name: undefined,
            description: undefined,
            validation_type: undefined,
            validation_code: undefined,
            error_message: undefined,
            is_active: undefined,
            updated_by: userId,
          }),
        );
      });

      it('should ignore unknown fields and process valid fields', async () => {
        // Arrange
        const updateDto = {
          description: 'Valid field',
          unknownField: 'This will be ignored by DTO',
        } as any;

        const updatedValidation = {
          ...mockValidationRegistry,
          description: 'Valid field',
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(updatedValidation);

        // Act
        await service.update(publicId, updateDto, userId);

        // Assert
        expect(repository.update).toHaveBeenCalledWith(
          publicId,
          expect.objectContaining({
            description: 'Valid field',
          }),
        );
        expect(repository.update).toHaveBeenCalledWith(
          publicId,
          expect.not.objectContaining({
            unknownField: expect.anything(),
          }),
        );
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        const updateDto = { name: 'newName' };
        repository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.update(publicId, updateDto, userId),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.update(publicId, updateDto, userId),
        ).rejects.toThrow(`Validation rule with ID "${publicId}" not found`);
        expect(repository.update).not.toHaveBeenCalled();
      });
    });

    describe('when new name already exists', () => {
      it('should throw ConflictException', async () => {
        // Arrange
        const updateDto = { name: 'existingName' };
        const anotherValidation = {
          ...mockValidationRegistry,
          id: 2,
          public_id: 'another-id',
          name: 'existingName',
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.findByName.mockResolvedValue(anotherValidation);

        // Act & Assert
        await expect(
          service.update(publicId, updateDto, userId),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.update(publicId, updateDto, userId),
        ).rejects.toThrow(
          'Validation rule with name "existingName" already exists',
        );
        expect(repository.update).not.toHaveBeenCalled();
      });
    });

    describe('component bindings', () => {
      it('should set component bindings when components are provided', async () => {
        // Arrange
        const updateDto = {
          description: 'Updated',
          components: ['TextField', 'NumberField'],
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(mockValidationRegistry);
        componentMappingService.setComponents.mockResolvedValue({
          items: [],
        });
        componentMappingService.getComponentTypes.mockResolvedValue([
          'TextField',
          'NumberField',
        ]);

        // Act
        const result = await service.update(publicId, updateDto, userId);

        // Assert
        expect(componentMappingService.setComponents).toHaveBeenCalledWith(
          publicId,
          { components: ['TextField', 'NumberField'] },
          userId,
        );
        expect(result.components).toEqual(['TextField', 'NumberField']);
      });

      it('should not set component bindings when components are not provided (undefined)', async () => {
        // Arrange
        const updateDto = {
          description: 'Updated',
          // components not provided = undefined
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.update(publicId, updateDto, userId);

        // Assert
        expect(componentMappingService.setComponents).not.toHaveBeenCalled();
      });

      it('should clear all component bindings when components is empty array', async () => {
        // Arrange
        const updateDto = {
          description: 'Updated',
          components: [], // Empty array = clear all bindings
        };

        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.update.mockResolvedValue(mockValidationRegistry);
        componentMappingService.setComponents.mockResolvedValue({
          items: [],
        });

        // Act
        await service.update(publicId, updateDto, userId);

        // Assert
        expect(componentMappingService.setComponents).toHaveBeenCalledWith(
          publicId,
          { components: [] },
          userId,
        );
      });
    });
  });

  describe('remove', () => {
    const publicId = 'LmockId123456';

    describe('when validation rule exists', () => {
      it('should successfully delete the validation rule', async () => {
        // Arrange
        repository.findByPublicId.mockResolvedValue(mockValidationRegistry);
        repository.delete.mockResolvedValue(mockValidationRegistry);

        // Act
        await service.remove(publicId);

        // Assert
        expect(repository.findByPublicId).toHaveBeenCalledWith(publicId);
        expect(repository.delete).toHaveBeenCalledWith(publicId);
      });
    });

    describe('when validation rule does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        repository.findByPublicId.mockResolvedValue(null);

        // Act & Assert
        await expect(service.remove(publicId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.remove(publicId)).rejects.toThrow(
          `Validation rule with ID "${publicId}" not found`,
        );
        expect(repository.delete).not.toHaveBeenCalled();
      });
    });
  });
});
