import { Test, TestingModule } from '@nestjs/testing';
import { MasterDataRecordService } from './master-data-record.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasterDataExternalApiService } from './master-data-external-api.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SourceType } from './dto/create-dataset.dto';

describe('MasterDataRecordService', () => {
  let service: MasterDataRecordService;

  const mockPrisma = {
    datasetDefinition: {
      findUnique: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockExternalApiService = {
    fetchAndMapRecords: jest.fn(),
    applyInMemoryQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataRecordService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: MasterDataExternalApiService,
          useValue: mockExternalApiService,
        },
      ],
    }).compile();

    service = module.get<MasterDataRecordService>(MasterDataRecordService);
  });

  describe('createRecord', () => {
    it('should insert a record with correct SQL', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [{ name: 'vendor_name' }],
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, vendor_name: 'A' },
      ]);

      await service.createRecord('VENDORS', { vendor_name: 'A' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO "master_data"."md_vendors" ("vendor_name") VALUES ($1)',
        ),
        'A',
      );
    });

    it('should insert multiple records (Bulk Insert)', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [{ name: 'vendor_name' }],
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, vendor_name: 'A' },
        { id: 2, vendor_name: 'B' },
      ]);

      const records = [{ vendor_name: 'A' }, { vendor_name: 'B' }];
      await service.createRecord('VENDORS', records);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO "master_data"."md_vendors" ("vendor_name") VALUES ($1), ($2)',
        ),
        'A',
        'B',
      );
    });

    it('should throw BadRequestException for unknown fields', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        fields: [{ name: 'vendor_name' }],
      });
      await expect(
        service.createRecord('VENDORS', { unknown: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exportAllRecords', () => {
    it('queries all rows with explicit columns ordered by id ASC', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [{ name: 'vendor_name', type: 'TEXT' }],
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, vendor_name: 'A' },
      ]);

      const { fields, rows } = await service.exportAllRecords('VENDORS');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT "id", "vendor_name" FROM "master_data"."md_vendors" ORDER BY id ASC',
        ),
      );
      expect(fields).toHaveLength(1);
      expect(rows).toEqual([{ id: 1, vendor_name: 'A' }]);
    });

    it('throws ForbiddenException for EXTERNAL_API datasets', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'EXT',
        table_name: 'md_ext',
        fields: [],
        source_type: SourceType.EXTERNAL_API,
      });

      await expect(service.exportAllRecords('EXT')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('importCsvRecords', () => {
    const vendorDefinition = {
      code: 'VENDORS',
      table_name: 'md_vendors',
      fields: [
        { name: 'vendor_name', type: 'TEXT' },
        { name: 'score', type: 'NUMBER' },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
          fn(mockPrisma),
      );
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    });

    it('inserts CSV rows in a single transaction', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        vendorDefinition,
      );
      const csv = Buffer.from('vendor_name,score\r\nAcme,100\r\nBeta,80');

      const result = await service.importCsvRecords('VENDORS', csv);

      expect(result).toEqual({ inserted: 2 });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO "master_data"."md_vendors" ("vendor_name", "score") VALUES',
        ),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('returns { inserted: 0 } for a CSV with only headers', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        vendorDefinition,
      );
      const csv = Buffer.from('vendor_name,score\n');

      const result = await service.importCsvRecords('VENDORS', csv);

      expect(result).toEqual({ inserted: 0 });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('silently ignores the "id" column if present in CSV headers', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        vendorDefinition,
      );
      const csv = Buffer.from('id,vendor_name,score\n1,Acme,100');

      const result = await service.importCsvRecords('VENDORS', csv);

      expect(result).toEqual({ inserted: 1 });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.not.stringContaining('"id"'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('throws BadRequestException for unknown CSV columns', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        vendorDefinition,
      );
      const csv = Buffer.from('vendor_name,unknown_col\nAcme,bad');

      await expect(service.importCsvRecords('VENDORS', csv)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('surfaces DB error message as BadRequestException', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue(
        vendorDefinition,
      );
      mockPrisma.$transaction.mockRejectedValue(
        new Error('unique constraint violation'),
      );
      const csv = Buffer.from('vendor_name,score\nDuplicate,1');

      await expect(service.importCsvRecords('VENDORS', csv)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException for EXTERNAL_API datasets', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        ...vendorDefinition,
        source_type: SourceType.EXTERNAL_API,
      });

      await expect(
        service.importCsvRecords('VENDORS', Buffer.from('a\n1')),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findRecords', () => {
    it('should query records with filter, select, and pagination', async () => {
      mockPrisma.datasetDefinition.findUnique.mockResolvedValue({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [{ name: 'vendor_name' }, { name: 'score' }],
      });

      // Mock count query then items query
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(15) }]) // Count query
        .mockResolvedValueOnce([{ id: 1, vendor_name: 'A' }]); // Items query

      const result = await service.findRecords(
        'VENDORS',
        { vendor_name: 'A' },
        ['vendor_name'],
        2,
        10,
      );

      // Check count query
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT COUNT(*) FROM "master_data"."md_vendors"',
        ),
        'A',
      );

      // Check items query
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT "vendor_name" FROM "master_data"."md_vendors" WHERE "vendor_name" = $1 ORDER BY id DESC LIMIT 10 OFFSET 10',
        ),
        'A',
      );

      expect(result).toEqual({
        items: [{ id: 1, vendor_name: 'A' }],
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2,
      });
    });
  });
});
