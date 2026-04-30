/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationRegistryController } from './validation-registry.controller';
import { ValidationRegistryService } from './validation-registry.service';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import { AuthGuard } from '../auth/auth.guard';
import { ValidationType } from '../common/types/common.types';
import type { AuthUser } from '../auth/types/auth-user';

describe('ValidationRegistryController', () => {
  let controller: ValidationRegistryController;
  let service: jest.Mocked<ValidationRegistryService>;
  let componentMappingService: jest.Mocked<ValidationComponentMappingService>;

  const mockAuthUser: AuthUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockValidationResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'emailValidator',
    description: 'Validates email format',
    validationType: ValidationType.CODE,
    validationCode: 'function validate(value) { return true; }',
    errorMessage: 'Invalid email',
    isActive: true,
    createdBy: 1,
    updatedBy: 1,
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockComponentMappingService = {
      setComponents: jest.fn(),
      getComponents: jest.fn(),
      removeComponent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidationRegistryController],
      providers: [
        {
          provide: ValidationRegistryService,
          useValue: mockService,
        },
        {
          provide: ValidationComponentMappingService,
          useValue: mockComponentMappingService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ValidationRegistryController>(
      ValidationRegistryController,
    );
    service = module.get(ValidationRegistryService);
    componentMappingService = module.get(ValidationComponentMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    describe('when creating a validation rule', () => {
      it('should call service.create with correct parameters', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          description: 'Validates email format',
          validationType: ValidationType.CODE,
          validationCode: 'function validate(value) { return true; }',
          errorMessage: 'Invalid email',
          isActive: true,
        };

        service.create.mockResolvedValue(mockValidationResponse);

        // Act
        const result = await controller.create(createDto, mockAuthUser);

        // Assert
        expect(service.create).toHaveBeenCalledWith(createDto, mockAuthUser.id);
        expect(service.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockValidationResponse);
      });

      it('should pass user ID from AuthUser to service', async () => {
        // Arrange
        const createDto = { name: 'testValidator' };
        const customUser: AuthUser = {
          id: 99,
          email: 'custom@test.com',
          name: 'Custom',
        };

        service.create.mockResolvedValue(mockValidationResponse);

        // Act
        await controller.create(createDto, customUser);

        // Assert
        expect(service.create).toHaveBeenCalledWith(createDto, 99);
      });

      it('should pass components to service when provided', async () => {
        // Arrange
        const createDto = {
          name: 'emailValidator',
          validationType: ValidationType.CODE,
          validationCode: 'function validate(value) { return true; }',
          components: ['TextField', 'EmailField'],
        };

        service.create.mockResolvedValue(mockValidationResponse);

        // Act
        await controller.create(createDto, mockAuthUser);

        // Assert
        expect(service.create).toHaveBeenCalledWith(createDto, mockAuthUser.id);
        expect(service.create).toHaveBeenCalledWith(
          expect.objectContaining({
            components: ['TextField', 'EmailField'],
          }),
          mockAuthUser.id,
        );
      });
    });
  });

  describe('findAll', () => {
    describe('when fetching validation rules', () => {
      it('should call service.findAll with pagination parameters', async () => {
        // Arrange
        const query = { page: 1, limit: 10 };
        const mockPaginatedResponse = {
          items: [mockValidationResponse],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        service.findAll.mockResolvedValue(mockPaginatedResponse);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(service.findAll).toHaveBeenCalledWith(query);
        expect(result).toEqual(mockPaginatedResponse);
      });

      it('should call service.findAll with all filter parameters', async () => {
        // Arrange
        const query = {
          page: 2,
          limit: 20,
          isComplete: true,
          isActive: false,
          validationType: ValidationType.API,
        };
        const mockPaginatedResponse = {
          items: [],
          total: 0,
          page: 2,
          limit: 20,
          totalPages: 0,
        };

        service.findAll.mockResolvedValue(mockPaginatedResponse);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(service.findAll).toHaveBeenCalledWith(query);
        expect(result).toEqual(mockPaginatedResponse);
      });

      it('should handle optional filter parameters', async () => {
        // Arrange
        const query = {
          page: 1,
          limit: 10,
          isActive: true,
        };
        const mockPaginatedResponse = {
          items: [mockValidationResponse],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        service.findAll.mockResolvedValue(mockPaginatedResponse);

        // Act
        await controller.findAll(query);

        // Assert
        expect(service.findAll).toHaveBeenCalledWith(query);
      });

      it('should call service.findAll with component filter', async () => {
        // Arrange
        const query = {
          page: 1,
          limit: 10,
          component: 'TextField',
        };
        const mockPaginatedResponse = {
          items: [mockValidationResponse],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        service.findAll.mockResolvedValue(mockPaginatedResponse);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(service.findAll).toHaveBeenCalledWith(query);
        expect(result).toEqual(mockPaginatedResponse);
      });

      it('should call service.findAll with name filter', async () => {
        // Arrange
        const query = {
          page: 1,
          limit: 10,
          name: 'email',
        };
        const mockPaginatedResponse = {
          items: [mockValidationResponse],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        service.findAll.mockResolvedValue(mockPaginatedResponse);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(service.findAll).toHaveBeenCalledWith(query);
        expect(result).toEqual(mockPaginatedResponse);
      });
    });
  });

  describe('findOne', () => {
    describe('when fetching a single validation rule', () => {
      it('should call service.findOne with correct ID', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        service.findOne.mockResolvedValue(mockValidationResponse);

        // Act
        const result = await controller.findOne(id);

        // Assert
        expect(service.findOne).toHaveBeenCalledWith(id);
        expect(service.findOne).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockValidationResponse);
      });
    });
  });

  describe('update', () => {
    describe('when updating a validation rule', () => {
      it('should call service.update with all parameters', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const updateDto = {
          name: 'updatedValidator',
          description: 'Updated description',
          isActive: false,
        };

        service.update.mockResolvedValue({
          ...mockValidationResponse,
          ...updateDto,
        });

        // Act
        const result = await controller.update(id, updateDto, mockAuthUser);

        // Assert
        expect(service.update).toHaveBeenCalledWith(
          id,
          updateDto,
          mockAuthUser.id,
        );
        expect(service.update).toHaveBeenCalledTimes(1);
        expect(result.name).toBe(updateDto.name);
      });

      it('should pass user ID from AuthUser to service', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const updateDto = { description: 'Updated' };
        const customUser: AuthUser = {
          id: 77,
          email: 'custom@test.com',
          name: 'Custom',
        };

        service.update.mockResolvedValue(mockValidationResponse);

        // Act
        await controller.update(id, updateDto, customUser);

        // Assert
        expect(service.update).toHaveBeenCalledWith(id, updateDto, 77);
      });

      it('should handle partial updates', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const updateDto = { isActive: false };

        service.update.mockResolvedValue({
          ...mockValidationResponse,
          isActive: false,
        });

        // Act
        const result = await controller.update(id, updateDto, mockAuthUser);

        // Assert
        expect(service.update).toHaveBeenCalledWith(
          id,
          updateDto,
          mockAuthUser.id,
        );
        expect(result.isActive).toBe(false);
      });

      it('should pass components to service when provided', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const updateDto = {
          description: 'Updated',
          components: ['TextField', 'NumberField'],
        };

        service.update.mockResolvedValue(mockValidationResponse);

        // Act
        await controller.update(id, updateDto, mockAuthUser);

        // Assert
        expect(service.update).toHaveBeenCalledWith(
          id,
          updateDto,
          mockAuthUser.id,
        );
        expect(service.update).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            components: ['TextField', 'NumberField'],
          }),
          mockAuthUser.id,
        );
      });

      it('should pass empty components array to service when clearing bindings', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        const updateDto = {
          description: 'Updated',
          components: [],
        };

        service.update.mockResolvedValue(mockValidationResponse);

        // Act
        await controller.update(id, updateDto, mockAuthUser);

        // Assert
        expect(service.update).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            components: [],
          }),
          mockAuthUser.id,
        );
      });
    });
  });

  describe('remove', () => {
    describe('when deleting a validation rule', () => {
      it('should call service.remove with correct ID', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        service.remove.mockResolvedValue(undefined);

        // Act
        await controller.remove(id);

        // Assert
        expect(service.remove).toHaveBeenCalledWith(id);
        expect(service.remove).toHaveBeenCalledTimes(1);
      });

      it('should return void', async () => {
        // Arrange
        const id = '550e8400-e29b-41d4-a716-446655440000';
        service.remove.mockResolvedValue(undefined);

        // Act
        const result = await controller.remove(id);

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Component Mapping Tests
  // ============================================================================

  describe('setComponents', () => {
    const validationId = '550e8400-e29b-41d4-a716-446655440000';

    describe('when setting component bindings', () => {
      it('should call componentMappingService.setComponents with correct parameters', async () => {
        // Arrange
        const dto = {
          components: ['TextField', 'EmailField', 'PasswordField'],
        };
        const mockResponse = {
          items: [
            {
              id: 'mapping-1',
              validationId,
              componentType: 'TextField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
            {
              id: 'mapping-2',
              validationId,
              componentType: 'EmailField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
            {
              id: 'mapping-3',
              validationId,
              componentType: 'PasswordField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
          ],
        };

        componentMappingService.setComponents.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.setComponents(
          validationId,
          dto,
          mockAuthUser,
        );

        // Assert
        expect(componentMappingService.setComponents).toHaveBeenCalledWith(
          validationId,
          dto,
          mockAuthUser.id,
        );
        expect(componentMappingService.setComponents).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      it('should pass user ID from AuthUser to service', async () => {
        // Arrange
        const dto = { components: ['TextField'] };
        const customUser: AuthUser = {
          id: 88,
          email: 'custom@test.com',
          name: 'Custom',
        };
        const mockResponse = {
          items: [
            {
              id: 'mapping-1',
              validationId,
              componentType: 'TextField',
              createdBy: 88,
              createdAt: 1704067200000,
            },
          ],
        };

        componentMappingService.setComponents.mockResolvedValue(mockResponse);

        // Act
        await controller.setComponents(validationId, dto, customUser);

        // Assert
        expect(componentMappingService.setComponents).toHaveBeenCalledWith(
          validationId,
          dto,
          88,
        );
      });

      it('should handle single component', async () => {
        // Arrange
        const dto = { components: ['TextField'] };
        const mockResponse = {
          items: [
            {
              id: 'mapping-1',
              validationId,
              componentType: 'TextField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
          ],
        };

        componentMappingService.setComponents.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.setComponents(
          validationId,
          dto,
          mockAuthUser,
        );

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.items[0].componentType).toBe('TextField');
      });
    });
  });

  describe('getComponents', () => {
    const validationId = '550e8400-e29b-41d4-a716-446655440000';

    describe('when getting component bindings', () => {
      it('should call componentMappingService.getComponents with correct ID', async () => {
        // Arrange
        const mockResponse = {
          items: [
            {
              id: 'mapping-1',
              validationId,
              componentType: 'TextField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
            {
              id: 'mapping-2',
              validationId,
              componentType: 'EmailField',
              createdBy: 1,
              createdAt: 1704067200000,
            },
          ],
        };

        componentMappingService.getComponents.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getComponents(validationId);

        // Assert
        expect(componentMappingService.getComponents).toHaveBeenCalledWith(
          validationId,
        );
        expect(componentMappingService.getComponents).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      it('should return empty items array when no bindings exist', async () => {
        // Arrange
        const mockResponse = {
          items: [],
        };

        componentMappingService.getComponents.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getComponents(validationId);

        // Assert
        expect(result.items).toHaveLength(0);
      });
    });
  });

  describe('removeComponent', () => {
    const validationId = '550e8400-e29b-41d4-a716-446655440000';
    const componentType = 'TextField';

    describe('when removing a component binding', () => {
      it('should call componentMappingService.removeComponent with correct parameters', async () => {
        // Arrange
        componentMappingService.removeComponent.mockResolvedValue(undefined);

        // Act
        await controller.removeComponent(validationId, componentType);

        // Assert
        expect(componentMappingService.removeComponent).toHaveBeenCalledWith(
          validationId,
          componentType,
        );
        expect(componentMappingService.removeComponent).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should return void', async () => {
        // Arrange
        componentMappingService.removeComponent.mockResolvedValue(undefined);

        // Act
        const result = await controller.removeComponent(
          validationId,
          componentType,
        );

        // Assert
        expect(result).toBeUndefined();
      });
    });
  });
});
