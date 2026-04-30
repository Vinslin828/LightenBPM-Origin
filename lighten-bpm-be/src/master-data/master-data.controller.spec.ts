import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { MasterDataSchemaService } from './master-data-schema.service';
import { MasterDataRecordService } from './master-data-record.service';
import { MasterDataExternalApiService } from './master-data-external-api.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/types/auth-user';
import { TestExternalApiDto } from './dto/test-external-api.dto';
import { CreateDatasetDto, FieldType } from './dto/create-dataset.dto';
import { UpdateExternalConfigDto } from './dto/update-external-config.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { UpdateDatasetSchemaDto } from './dto/update-dataset-schema.dto';
import { ImportDefinitionDto } from './dto/import-dataset.dto';

describe('MasterDataController', () => {
  let controller: MasterDataController;

  const mockSchemaService = {
    createDataset: jest.fn().mockResolvedValue({ code: 'DS1' }),
    listDatasets: jest.fn(),
    getDataset: jest.fn(),
    getDatasetCodeByName: jest.fn(),
    deleteDataset: jest.fn().mockResolvedValue(undefined),
    updateDataset: jest
      .fn()
      .mockResolvedValue({ code: 'DS1', name: 'Updated' }),
    updateDatasetSchema: jest
      .fn()
      .mockResolvedValue({ code: 'DS1', fields: [] }),
    updateExternalConfig: jest
      .fn()
      .mockResolvedValue({ code: 'DS1', external_api: {} }),
    exportDataset: jest.fn().mockResolvedValue({
      definition: { code: 'DS1', table_name: 'md_ds1', fields: [] },
    }),
    importDataset: jest.fn().mockResolvedValue({
      success: true,
      definition: { code: 'DS1', table_name: 'md_ds1', fields: [] },
    }),
  };

  const mockRecordService = {
    createRecord: jest.fn().mockResolvedValue([{ id: 1 }]),
    findRecords: jest.fn(),
    updateRecords: jest.fn().mockResolvedValue([{ id: 1 }]),
    deleteRecords: jest.fn().mockResolvedValue([{ id: 1 }]),
    exportAllRecords: jest.fn().mockResolvedValue({ fields: [], rows: [] }),
    importCsvRecords: jest.fn().mockResolvedValue({ inserted: 2 }),
  };

  const mockExternalApiService = {
    testExternalApi: jest.fn().mockResolvedValue({ data: [] }),
  };

  const adminUser = { id: 1, code: 'ADMIN1', bpmRole: 'admin' } as AuthUser;
  const regularUser = { id: 2, code: 'USER1', bpmRole: 'user' } as AuthUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterDataController],
      providers: [
        { provide: MasterDataSchemaService, useValue: mockSchemaService },
        { provide: MasterDataRecordService, useValue: mockRecordService },
        {
          provide: MasterDataExternalApiService,
          useValue: mockExternalApiService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MasterDataController>(MasterDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('admin guard - testExternalApi', () => {
    const dto = {
      api_config: { url: 'http://example.com' },
    } as TestExternalApiDto;

    it('should allow admin to test external API', async () => {
      await controller.testExternalApi(dto, adminUser);
      expect(mockExternalApiService.testExternalApi).toHaveBeenCalled();
    });

    it('should reject non-admin from testing external API', async () => {
      await expect(
        controller.testExternalApi(dto, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - createDataset', () => {
    const dto: CreateDatasetDto = {
      code: 'TEST',
      name: 'Test',
      fields: [{ name: 'col1', type: FieldType.TEXT, required: false }],
    };

    it('should allow admin to create dataset', async () => {
      await controller.createDataset(dto, adminUser);
      expect(mockSchemaService.createDataset).toHaveBeenCalled();
    });

    it('should reject non-admin from creating dataset', async () => {
      await expect(controller.createDataset(dto, regularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('admin guard - deleteDataset', () => {
    it('should allow admin to delete dataset', async () => {
      await controller.deleteDataset('DS1', adminUser);
      expect(mockSchemaService.deleteDataset).toHaveBeenCalledWith('DS1');
    });

    it('should reject non-admin from deleting dataset', async () => {
      await expect(
        controller.deleteDataset('DS1', regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - updateDataset', () => {
    const dto: UpdateDatasetDto = { name: 'Updated Name' };

    it('should allow admin to update dataset metadata', async () => {
      await controller.updateDataset('DS1', dto, adminUser);
      expect(mockSchemaService.updateDataset).toHaveBeenCalledWith(
        'DS1',
        dto,
        adminUser.code,
      );
    });

    it('should reject non-admin from updating dataset metadata', async () => {
      await expect(
        controller.updateDataset('DS1', dto, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - updateDatasetSchema', () => {
    const dto: UpdateDatasetSchemaDto = {
      add_fields: [{ name: 'new_col', type: FieldType.TEXT, required: false }],
    };

    it('should allow admin to update dataset schema', async () => {
      await controller.updateDatasetSchema('DS1', dto, adminUser);
      expect(mockSchemaService.updateDatasetSchema).toHaveBeenCalledWith(
        'DS1',
        dto,
        adminUser.code,
      );
    });

    it('should reject non-admin from updating dataset schema', async () => {
      await expect(
        controller.updateDatasetSchema('DS1', dto, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - updateExternalConfig', () => {
    const dto: UpdateExternalConfigDto = {
      api_config: { url: 'http://example.com', method: 'GET' },
    };

    it('should allow admin to update external config', async () => {
      await controller.updateExternalConfig('DS1', dto, adminUser);
      expect(mockSchemaService.updateExternalConfig).toHaveBeenCalled();
    });

    it('should reject non-admin from updating external config', async () => {
      await expect(
        controller.updateExternalConfig('DS1', dto, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('importDataset', () => {
    const mockSetHeader = jest.fn();
    const mockRes = {
      setHeader: mockSetHeader,
    } as unknown as import('express').Response;

    const basePayload: ImportDefinitionDto = {
      definition: {
        code: 'TEST',
        name: 'Test',
        fields: [{ name: 'col1', type: FieldType.TEXT, required: false }],
      },
    };

    it('should allow admin to import dataset', async () => {
      await controller.importDataset(basePayload, adminUser, mockRes);
      expect(mockSchemaService.importDataset).toHaveBeenCalled();
    });

    it('should reject non-admin from importing dataset', async () => {
      await expect(
        controller.importDataset(basePayload, regularUser, mockRes),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sets Deprecation header when payload contains records', async () => {
      const payloadWithRecords: ImportDefinitionDto = {
        ...basePayload,
        records: [{ vendor_name: 'Vendor A' }],
      };

      await controller.importDataset(payloadWithRecords, adminUser, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith('Deprecation', 'true');
    });

    it('does not set Deprecation header when payload has no records', async () => {
      await controller.importDataset(basePayload, adminUser, mockRes);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });
  });

  describe('exportRecordsCsv', () => {
    it('returns a StreamableFile for any authenticated user', async () => {
      const result = await controller.exportRecordsCsv('VENDORS');
      expect(mockRecordService.exportAllRecords).toHaveBeenCalledWith(
        'VENDORS',
      );
      expect(result).toBeDefined();
    });
  });

  describe('admin guard - importRecordsCsv', () => {
    const mockFile = { buffer: Buffer.from('a\n1') } as Express.Multer.File;

    it('should allow admin to import CSV', async () => {
      const result = await controller.importRecordsCsv(
        'VENDORS',
        mockFile,
        adminUser,
      );
      expect(mockRecordService.importCsvRecords).toHaveBeenCalledWith(
        'VENDORS',
        mockFile.buffer,
      );
      expect(result).toEqual({ inserted: 2 });
    });

    it('should reject non-admin from importing CSV', async () => {
      await expect(
        controller.importRecordsCsv('VENDORS', mockFile, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.importRecordsCsv(
          'VENDORS',
          undefined as unknown as Express.Multer.File,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('admin guard - createRecord', () => {
    it('should allow admin to create record', async () => {
      await controller.createRecord('DS1', { field: 'value' }, adminUser);
      expect(mockRecordService.createRecord).toHaveBeenCalled();
    });

    it('should reject non-admin from creating record', async () => {
      await expect(
        controller.createRecord('DS1', { field: 'value' }, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - updateRecords', () => {
    it('should allow admin to update records', async () => {
      await controller.updateRecords(
        'DS1',
        { id: '1' },
        { field: 'new' },
        adminUser,
      );
      expect(mockRecordService.updateRecords).toHaveBeenCalled();
    });

    it('should reject non-admin from updating records', async () => {
      await expect(
        controller.updateRecords(
          'DS1',
          { id: '1' },
          { field: 'new' },
          regularUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin guard - deleteRecords', () => {
    it('should allow admin to delete records', async () => {
      await controller.deleteRecords('DS1', { id: '1' }, adminUser);
      expect(mockRecordService.deleteRecords).toHaveBeenCalled();
    });

    it('should reject non-admin from deleting records', async () => {
      await expect(
        controller.deleteRecords('DS1', { id: '1' }, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
