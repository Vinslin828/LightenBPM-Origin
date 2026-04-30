/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { MasterDataSchemaService } from './master-data-schema.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateDatasetDto,
  FieldType,
  SourceType,
} from './dto/create-dataset.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { UpdateDatasetSchemaDto } from './dto/update-dataset-schema.dto';
import { RebuildDatasetSchemaDto } from './dto/rebuild-dataset-schema.dto';

describe('MasterDataSchemaService', () => {
  let service: MasterDataSchemaService;

  const mockPrisma: any = {
    datasetDefinition: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataSchemaService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MasterDataSchemaService>(MasterDataSchemaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create schema if it does not exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await service.onModuleInit();
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT schema_name FROM information_schema.schemata',
        ),
        'master_data',
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'CREATE SCHEMA IF NOT EXISTS "master_data";',
      );
    });

    it('should skip creation if schema exists', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { schema_name: 'master_data' },
      ]);
      mockPrisma.$executeRawUnsafe.mockClear();
      await service.onModuleInit();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('createDataset', () => {
    it('should create a dataset and its table', async () => {
      const dto: CreateDatasetDto = {
        code: 'VENDORS',
        name: 'Vendors',
        fields: [{ name: 'name', type: FieldType.TEXT, required: true }],
      };

      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.datasetDefinition.create.mockResolvedValue({
        ...dto,
        table_name: 'md_vendors',
      });

      await service.createDataset(dto, 'user1');

      expect(mockPrisma.datasetDefinition.create).toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE "master_data"."md_vendors"'),
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('"name" VARCHAR(2000) NOT NULL'),
      );
    });

    it('should generate fixed VARCHAR and DECIMAL types', async () => {
      const dto: CreateDatasetDto = {
        code: 'PRODUCTS',
        name: 'Products',
        fields: [
          {
            name: 'sku',
            type: FieldType.TEXT,
            required: true,
          },
          {
            name: 'price',
            type: FieldType.NUMBER,
            required: false,
          },
        ],
      };

      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.datasetDefinition.create.mockResolvedValue({
        ...dto,
        table_name: 'md_products',
      });

      await service.createDataset(dto, 'user1');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('"sku" VARCHAR(2000) NOT NULL'),
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('"price" DECIMAL(20, 5)'),
      );
    });

    it('should throw ConflictException if code exists', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.createDataset({ code: 'VENDORS' } as any, 'user1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if code is a system dataset', async () => {
      await expect(
        service.createDataset({ code: 'USERS' } as any, 'user1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteDataset', () => {
    it('should delete dataset and drop table', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        table_name: 'md_vendors',
      });

      await service.deleteDataset('VENDORS');

      expect(mockPrisma.datasetDefinition.delete).toHaveBeenCalledWith({
        where: { code: 'VENDORS' },
      });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE "master_data"."md_vendors"'),
      );
    });

    it('should throw ConflictException if trying to delete a system dataset', async () => {
      await expect(service.deleteDataset('USERS')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if dataset not found', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      await expect(service.deleteDataset('NONE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDataset', () => {
    it('should return system dataset', async () => {
      const result = await service.getDataset('USERS');
      expect(result.code).toBe('USERS');
      expect(result.created_by).toBe('SYSTEM');
      expect(result.id).toBe(0);
    });

    it('should return custom dataset', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        fields: [],
      });
      const result = await service.getDataset('VENDORS');
      expect(result.code).toBe('VENDORS');
      expect(result.fields).toEqual([]);
    });

    it('should throw NotFoundException if dataset not found', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      await expect(service.getDataset('NONE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDatasetCodeByName', () => {
    it('should return code for system dataset', async () => {
      const result = await service.getDatasetCodeByName('System Users');
      expect(result.code).toBe('USERS');
    });

    it('should return code for custom dataset from DB', async () => {
      mockPrisma.datasetDefinition.findFirst.mockResolvedValue({
        code: 'VENDORS',
      });
      const result = await service.getDatasetCodeByName('Vendors');
      expect(result.code).toBe('VENDORS');
      expect(mockPrisma.datasetDefinition.findFirst).toHaveBeenCalledWith({
        where: { name: 'Vendors' },
        select: { code: true },
      });
    });

    it('should throw NotFoundException if name not found', async () => {
      mockPrisma.datasetDefinition.findFirst.mockResolvedValue(null);
      await expect(service.getDatasetCodeByName('Unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDataset', () => {
    const existingDefinition = {
      id: 1,
      code: 'VENDORS',
      table_name: 'md_vendors',
      name: 'Vendors',
      fields: [],
      source_type: SourceType.DATABASE,
      api_config: null,
      field_mappings: null,
      created_by: 'user1',
      updated_by: 'user1',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update the display name', async () => {
      const dto: UpdateDatasetDto = { name: 'Updated Vendors' };
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        existingDefinition,
      );
      mockPrisma.datasetDefinition.findFirst.mockResolvedValue(null);
      mockPrisma.datasetDefinition.update.mockResolvedValue({
        ...existingDefinition,
        name: 'Updated Vendors',
      });

      const result = await service.updateDataset('VENDORS', dto, 'admin');

      expect(mockPrisma.datasetDefinition.update).toHaveBeenCalledWith({
        where: { code: 'VENDORS' },
        data: { name: 'Updated Vendors', updated_by: 'admin' },
      });
      expect(result.name).toBe('Updated Vendors');
    });

    it('should throw ConflictException for system datasets', async () => {
      await expect(
        service.updateDataset('USERS', { name: 'New Name' }, 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if dataset does not exist', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      await expect(
        service.updateDataset('NONE', { name: 'X' }, 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name conflicts with another dataset', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        existingDefinition,
      );
      mockPrisma.datasetDefinition.findFirst.mockResolvedValue({
        code: 'OTHER',
      });

      await expect(
        service.updateDataset('VENDORS', { name: 'Existing Name' }, 'admin'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDatasetSchema', () => {
    const existingDefinition = {
      id: 1,
      code: 'VENDORS',
      table_name: 'md_vendors',
      name: 'Vendors',
      fields: [
        { name: 'vendor_name', type: FieldType.TEXT, required: true },
        { name: 'score', type: FieldType.NUMBER, required: false },
      ],
      source_type: SourceType.DATABASE,
      api_config: null,
      field_mappings: null,
      created_by: 'user1',
      updated_by: 'user1',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        existingDefinition,
      );
      mockPrisma.datasetDefinition.update.mockResolvedValue(existingDefinition);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ has_rows: false }]);
    });

    it('should add a nullable column', async () => {
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [
          { name: 'active', type: FieldType.BOOLEAN, required: false },
        ],
      };

      await service.updateDatasetSchema('VENDORS', dto, 'admin');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ADD COLUMN "active" BOOLEAN'),
      );
      expect(mockPrisma.datasetDefinition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fields: expect.arrayContaining([
              expect.objectContaining({
                name: 'active',
                type: FieldType.BOOLEAN,
              }),
            ]),
          }),
        }),
      );
    });

    it('should add a required column to empty table without default_value', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ has_rows: false }]);
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [{ name: 'status', type: FieldType.TEXT, required: true }],
      };

      await service.updateDatasetSchema('VENDORS', dto, 'admin');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ADD COLUMN "status" VARCHAR(2000) NOT NULL'),
      );
    });

    it('should add a required column with default when table has rows (two-step DDL)', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ has_rows: true }]);
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [
          {
            name: 'status',
            type: FieldType.TEXT,
            required: true,
            default_value: 'active',
          },
        ],
      };

      await service.updateDatasetSchema('VENDORS', dto, 'admin');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'ADD COLUMN "status" VARCHAR(2000) NOT NULL DEFAULT \'active\'',
        ),
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ALTER COLUMN "status" DROP DEFAULT'),
      );
    });

    it('should throw BadRequestException when adding required column to populated table without default_value', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ has_rows: true }]);
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [{ name: 'status', type: FieldType.TEXT, required: true }],
      };

      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove a column', async () => {
      const dto: UpdateDatasetSchemaDto = {
        remove_fields: ['score'],
      };

      await service.updateDatasetSchema('VENDORS', dto, 'admin');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP COLUMN "score"'),
      );
      const updateCall = mockPrisma.datasetDefinition.update.mock.calls[0][0];
      expect(updateCall.data.fields).not.toContainEqual(
        expect.objectContaining({ name: 'score' }),
      );
    });

    it('should process removals before additions (order of DDL)', async () => {
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [
          { name: 'new_col', type: FieldType.TEXT, required: false },
        ],
        remove_fields: ['score'],
      };
      const executedSqls: string[] = [];
      mockPrisma.$executeRawUnsafe.mockImplementation((sql: string) => {
        executedSqls.push(sql);
        return Promise.resolve();
      });

      await service.updateDatasetSchema('VENDORS', dto, 'admin');

      const dropIdx = executedSqls.findIndex((s) => s.includes('DROP COLUMN'));
      const addIdx = executedSqls.findIndex((s) => s.includes('ADD COLUMN'));
      expect(dropIdx).toBeLessThan(addIdx);
    });

    it('should throw ConflictException for system datasets', async () => {
      await expect(
        service.updateDatasetSchema('USERS', {}, 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if dataset does not exist', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      await expect(
        service.updateDatasetSchema(
          'NONE',
          {
            add_fields: [{ name: 'x', type: FieldType.TEXT, required: false }],
          },
          'admin',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for EXTERNAL_API datasets', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        ...existingDefinition,
        source_type: SourceType.EXTERNAL_API,
      });

      await expect(
        service.updateDatasetSchema(
          'VENDORS',
          {
            add_fields: [{ name: 'x', type: FieldType.TEXT, required: false }],
          },
          'admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both add_fields and remove_fields are empty', async () => {
      await expect(
        service.updateDatasetSchema('VENDORS', {}, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when add_fields contains duplicate vs existing', async () => {
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [
          { name: 'vendor_name', type: FieldType.TEXT, required: false },
        ],
      };
      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when add_fields has internal duplicates', async () => {
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [
          { name: 'new_col', type: FieldType.TEXT, required: false },
          { name: 'new_col', type: FieldType.NUMBER, required: false },
        ],
      };
      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when remove_fields contains non-existent field', async () => {
      const dto: UpdateDatasetSchemaDto = { remove_fields: ['nonexistent'] };
      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to add "id" field', async () => {
      const dto: UpdateDatasetSchemaDto = {
        add_fields: [{ name: 'id', type: FieldType.NUMBER, required: true }],
      };
      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to remove "id" field', async () => {
      const dto: UpdateDatasetSchemaDto = { remove_fields: ['id'] };
      await expect(
        service.updateDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rebuildDatasetSchema', () => {
    const baseDefinition = {
      id: 1,
      code: 'VENDORS',
      table_name: 'md_vendors',
      name: 'Vendors',
      fields: [{ name: 'vendor_name', type: FieldType.TEXT, required: true }],
      source_type: SourceType.DATABASE,
      api_config: null,
      field_mappings: null,
      created_by: 'admin',
      updated_by: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(baseDefinition);
      mockPrisma.datasetDefinition.update.mockResolvedValue({
        ...baseDefinition,
        fields: [{ name: 'status', type: FieldType.TEXT, required: false }],
      });
      mockPrisma.$transaction.mockImplementation(
        (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
          callback(mockPrisma),
      );
    });

    it('should drop and recreate the table with the new schema', async () => {
      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'status', type: FieldType.TEXT, required: false }],
        confirm_data_loss: true,
      };

      await service.rebuildDatasetSchema('VENDORS', dto, 'admin');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE IF EXISTS'),
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE'),
      );
      expect(mockPrisma.datasetDefinition.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'VENDORS' } }),
      );
    });

    it('should throw BadRequestException when confirm_data_loss is false', async () => {
      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'status', type: FieldType.TEXT, required: false }],
        confirm_data_loss: false,
      };

      await expect(
        service.rebuildDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for system datasets', async () => {
      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'code', type: FieldType.TEXT, required: true }],
        confirm_data_loss: true,
      };

      await expect(
        service.rebuildDatasetSchema('USERS', dto, 'admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when dataset does not exist', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);

      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'status', type: FieldType.TEXT, required: false }],
        confirm_data_loss: true,
      };

      await expect(
        service.rebuildDatasetSchema('NONEXISTENT', dto, 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for EXTERNAL_API datasets', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        ...baseDefinition,
        source_type: SourceType.EXTERNAL_API,
      });

      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'status', type: FieldType.TEXT, required: false }],
        confirm_data_loss: true,
      };

      await expect(
        service.rebuildDatasetSchema('VENDORS', dto, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should skip rebuild and return current definition when schema is unchanged', async () => {
      const dto: RebuildDatasetSchemaDto = {
        fields: [{ name: 'vendor_name', type: FieldType.TEXT, required: true }],
        confirm_data_loss: true,
      };

      const result = await service.rebuildDatasetSchema(
        'VENDORS',
        dto,
        'admin',
      );

      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockPrisma.datasetDefinition.update).not.toHaveBeenCalled();
      expect(result.code).toBe('VENDORS');
    });

    it('should filter out any "id" field from incoming fields', async () => {
      const dto: RebuildDatasetSchemaDto = {
        fields: [
          { name: 'id', type: FieldType.NUMBER, required: true },
          { name: 'status', type: FieldType.TEXT, required: false },
        ],
        confirm_data_loss: true,
      };

      await service.rebuildDatasetSchema('VENDORS', dto, 'admin');

      const updateCall = mockPrisma.datasetDefinition.update.mock.calls[0][0];
      const savedFields = updateCall.data.fields as Array<{ name: string }>;
      expect(savedFields.every((f) => f.name !== 'id')).toBe(true);
    });
  });

  describe('listDatasets', () => {
    it('should return paginated datasets with system datasets on first page', async () => {
      mockPrisma.datasetDefinition.findMany.mockResolvedValue([
        { code: 'D1', fields: [] },
        { code: 'D2', fields: [] },
      ]);
      mockPrisma.datasetDefinition.count.mockResolvedValue(2);

      const result = await service.listDatasets(1, 10);

      expect(mockPrisma.datasetDefinition.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });

      // Total should be system datasets (2) + DB items (2)
      expect(result.total).toBe(4);
      expect(result.items.length).toBe(4);
      expect(result.items[0].code).toBe('USERS');
      expect(result.items[1].code).toBe('ORG_UNITS');
      expect(result.items[2].code).toBe('D1');
      expect(result.items[3].code).toBe('D2');
    });

    it('should return only DB items on second page', async () => {
      mockPrisma.datasetDefinition.findMany.mockResolvedValue([
        { code: 'D3', fields: [] },
      ]);
      mockPrisma.datasetDefinition.count.mockResolvedValue(3);

      const result = await service.listDatasets(2, 2);

      expect(mockPrisma.datasetDefinition.findMany).toHaveBeenCalledWith({
        skip: 2,
        take: 2,
        orderBy: { created_at: 'desc' },
      });

      expect(result.total).toBe(5); // 2 system + 3 DB
      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe('D3');
    });
  });

  describe('exportDataset', () => {
    beforeEach(() => jest.clearAllMocks());

    const mockDefinition = {
      id: 1,
      code: 'VENDORS',
      table_name: 'md_vendors',
      name: 'Vendors',
      source_type: SourceType.DATABASE,
      fields: [{ name: 'vendor_name', type: FieldType.TEXT, required: true }],
      api_config: null,
      field_mappings: null,
    };

    it('returns only definition — no records key', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(mockDefinition);

      const result = await service.exportDataset('VENDORS');

      expect(result).toHaveProperty('definition');
      expect(result).not.toHaveProperty('records');
    });

    it('allows export of EXTERNAL_API datasets (schema only)', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        ...mockDefinition,
        source_type: SourceType.EXTERNAL_API,
      });

      const result = await service.exportDataset('VENDORS');

      expect(result).toHaveProperty('definition');
      expect(result.definition.source_type).toBe(SourceType.EXTERNAL_API);
    });

    it('throws NotFoundException when dataset does not exist', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);

      await expect(service.exportDataset('NONEXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('importDataset', () => {
    beforeEach(() => jest.clearAllMocks());

    const baseDto: CreateDatasetDto = {
      code: 'VENDORS',
      name: 'Vendors',
      fields: [{ name: 'vendor_name', type: FieldType.TEXT, required: true }],
    };

    const createdDefinition = {
      id: 1,
      code: 'VENDORS',
      table_name: 'md_vendors',
      name: 'Vendors',
      source_type: SourceType.DATABASE,
      fields: [{ name: 'vendor_name', type: FieldType.TEXT, required: true }],
      api_config: null,
      field_mappings: null,
      created_by: 'user1',
      updated_by: 'user1',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    it('creates definition and returns { success, definition } for new dataset', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.datasetDefinition.create.mockResolvedValue(createdDefinition);

      const result = await service.importDataset(
        { definition: baseDto },
        'user1',
      );

      expect(result.success).toBe(true);
      expect(result.definition).toHaveProperty('code', 'VENDORS');
      expect(result).not.toHaveProperty('count');
    });

    it('is a no-op for existing dataset — returns { success, definition }', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        createdDefinition,
      );

      const result = await service.importDataset(
        { definition: baseDto },
        'user1',
      );

      expect(result.success).toBe(true);
      expect(result.definition.code).toBe('VENDORS');
      expect(mockPrisma.datasetDefinition.create).not.toHaveBeenCalled();
    });

    it('preserves audit fields (created_by, updated_by, created_at) when provided', async () => {
      const auditDate = '2023-06-15T10:00:00.000Z';
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.datasetDefinition.create.mockResolvedValue(createdDefinition);
      mockPrisma.datasetDefinition.update.mockResolvedValue({
        ...createdDefinition,
        created_by: 'original_user',
        updated_by: 'original_user',
        created_at: new Date(auditDate),
      });

      await service.importDataset(
        {
          definition: {
            ...baseDto,
            created_by: 'original_user',
            updated_by: 'original_user',
            created_at: auditDate,
          },
        },
        'user1',
      );

      expect(mockPrisma.datasetDefinition.update).toHaveBeenCalledWith({
        where: { code: 'VENDORS' },
        data: expect.objectContaining({
          created_by: 'original_user',
          updated_by: 'original_user',
          created_at: new Date(auditDate),
        }),
      });
    });

    it('falls back to userCode when no audit fields are provided', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.datasetDefinition.create.mockResolvedValue(createdDefinition);

      await service.importDataset({ definition: baseDto }, 'user1');

      expect(mockPrisma.datasetDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ created_by: 'user1' }),
        }),
      );
      expect(mockPrisma.datasetDefinition.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for EXTERNAL_API datasets', async () => {
      await expect(
        service.importDataset(
          {
            definition: {
              ...baseDto,
              source_type: SourceType.EXTERNAL_API,
            },
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
