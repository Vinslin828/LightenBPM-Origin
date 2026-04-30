/**
 * Unit Tests - GetMasterDataExecutor
 */

import { Decimal } from '@prisma/client/runtime/library';
import { GetMasterDataExecutor } from './get-master-data.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError } from '../../types';
import { MasterDataRecordService } from '../../../master-data/master-data-record.service';

describe('GetMasterDataExecutor', () => {
  let executor: GetMasterDataExecutor;
  let mockMasterDataRecordService: jest.Mocked<MasterDataRecordService>;

  beforeEach(() => {
    mockMasterDataRecordService = {
      findRecords: jest.fn(),
      getDefinitionByName: jest.fn(),
    } as unknown as jest.Mocked<MasterDataRecordService>;

    executor = new GetMasterDataExecutor(mockMasterDataRecordService);
  });

  // ===========================================================================
  // Success cases
  // ===========================================================================

  describe('Success cases', () => {
    it('should return array of records when dataset exists', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [
          { id: 1, vendor_name: 'Vendor A', score: 100 },
          { id: 2, vendor_name: 'Vendor B', score: 85 },
        ],
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Vendor List'], context);

      // Assert
      expect(result).toEqual([
        { id: 1, vendor_name: 'Vendor A', score: 100 },
        { id: 2, vendor_name: 'Vendor B', score: 85 },
      ]);
    });

    it('should keep snake_case keys as-is', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [
          {
            id: 1,
            vendor_name: 'Test',
            is_active: true,
            created_at: '2024-01-01',
          },
        ],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Vendor List'], context);

      // Assert
      expect(result).toEqual([
        {
          id: 1,
          vendor_name: 'Test',
          is_active: true,
          created_at: '2024-01-01',
        },
      ]);
    });

    it('should return empty array when dataset has no records', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'EMPTY_DATASET',
        table_name: 'md_empty',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      const result = await executor.execute(['Empty Dataset'], context);

      // Assert
      expect(result).toEqual([]);
    });

    it('should resolve dataset name to code and pass default parameters', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'MY_DATASET',
        table_name: 'md_my_dataset',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(['My Dataset'], context);

      // Assert
      /* eslint-disable @typescript-eslint/unbound-method */
      expect(
        mockMasterDataRecordService.getDefinitionByName,
      ).toHaveBeenCalledWith('My Dataset');
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'MY_DATASET',
        {},
        undefined,
        1,
        10000,
        undefined,
        'asc',
      );
      /* eslint-enable @typescript-eslint/unbound-method */
    });
  });

  // ===========================================================================
  // Options - filter
  // ===========================================================================

  describe('Options - filter', () => {
    it('should pass filter with snake_case keys directly', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'CURRENCIES',
        table_name: 'md_currencies',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [{ id: 1, currency_code: 'USD' }],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(
        ['Currency List', { filter: { currency_code: 'USD' } }],
        context,
      );

      // Assert
      expect(result).toEqual([{ id: 1, currency_code: 'USD' }]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'CURRENCIES',
        { currency_code: 'USD' },
        undefined,
        1,
        10000,
        undefined,
        'asc',
      );
    });

    it('should pass multiple filter conditions', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(
        [
          'Vendor List',
          { filter: { status: 'active', vendor_type: 'premium' } },
        ],
        context,
      );

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        { status: 'active', vendor_type: 'premium' },
        undefined,
        1,
        10000,
        undefined,
        'asc',
      );
    });
  });

  // ===========================================================================
  // Options - sort
  // ===========================================================================

  describe('Options - sort', () => {
    it('should pass sort field in snake_case with default asc order', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(
        ['Vendor List', { sort: { field: 'vendor_name' } }],
        context,
      );

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        1,
        10000,
        'vendor_name',
        'asc',
      );
    });

    it('should pass sort field with desc order when specified', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(
        ['Vendor List', { sort: { field: 'score', order: 'desc' } }],
        context,
      );

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        1,
        10000,
        'score',
        'desc',
      );
    });
  });

  // ===========================================================================
  // Options - select
  // ===========================================================================

  describe('Options - select', () => {
    it('should pass select fields in snake_case directly', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [{ id: 1, vendor_name: 'Test' }],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(
        ['Vendor List', { select: ['id', 'vendor_name'] }],
        context,
      );

      // Assert
      expect(result).toEqual([{ id: 1, vendor_name: 'Test' }]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        ['id', 'vendor_name'],
        1,
        10000,
        undefined,
        'asc',
      );
    });
  });

  // ===========================================================================
  // Options - page
  // ===========================================================================

  describe('Options - page', () => {
    it('should pass page number when specified', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 5,
      });

      // Act
      await executor.execute(['Vendor List', { page: 2, limit: 10 }], context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        2,
        10,
        undefined,
        'asc',
      );
    });

    it('should default to page 1 when not specified', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(['Vendor List'], context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        1,
        10000,
        undefined,
        'asc',
      );
    });
  });

  // ===========================================================================
  // Options - limit
  // ===========================================================================

  describe('Options - limit', () => {
    it('should pass custom limit when specified', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await executor.execute(['Vendor List', { limit: 10 }], context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        1,
        10,
        undefined,
        'asc',
      );
    });

    it('should cap limit at MAX_RECORDS when exceeding', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      // Act
      await executor.execute(['Vendor List', { limit: 99999 }], context);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        {},
        undefined,
        1,
        10000,
        undefined,
        'asc',
      );
    });
  });

  // ===========================================================================
  // Options - combined
  // ===========================================================================

  describe('Options - combined', () => {
    it('should pass all options together', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [{ id: 1, vendor_name: 'Active Vendor' }],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(
        [
          'Vendor List',
          {
            filter: { is_active: true },
            sort: { field: 'score', order: 'desc' },
            select: ['id', 'vendor_name'],
            limit: 50,
          },
        ],
        context,
      );

      // Assert
      expect(result).toEqual([{ id: 1, vendor_name: 'Active Vendor' }]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMasterDataRecordService.findRecords).toHaveBeenCalledWith(
        'VENDORS',
        { is_active: true },
        ['id', 'vendor_name'],
        1,
        50,
        'score',
        'desc',
      );
    });
  });

  // ===========================================================================
  // Error cases
  // ===========================================================================

  describe('Error cases', () => {
    it('should throw error when no arguments provided', async () => {
      // Arrange
      const context: ExecutionContext = {};

      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'getMasterData() expects 1-2 arguments (dataset name, options?), got 0',
      );
    });

    it('should throw error when more than 2 arguments provided', async () => {
      // Arrange
      const context: ExecutionContext = {};

      // Act & Assert
      await expect(
        executor.execute(['Vendor List', {}, 'extra'], context),
      ).rejects.toThrow(FlowExecutionError);
      await expect(
        executor.execute(['Vendor List', {}, 'extra'], context),
      ).rejects.toThrow(
        'getMasterData() expects 1-2 arguments (dataset name, options?), got 3',
      );
    });

    it('should throw error when dataset not found by name', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockRejectedValue(
        new Error('Dataset with name "Nonexistent" not found.'),
      );

      // Act & Assert
      await expect(executor.execute(['Nonexistent'], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(['Nonexistent'], context)).rejects.toThrow(
        'Failed to fetch master data "Nonexistent": Dataset with name "Nonexistent" not found.',
      );
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('Edge cases', () => {
    it('should handle records with nested objects', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'CONFIG',
        table_name: 'md_config',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [
          {
            id: 1,
            config: { nested_key: 'value' },
          },
        ],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Config'], context);

      // Assert
      expect(result).toEqual([{ id: 1, config: { nested_key: 'value' } }]);
    });

    it('should handle records with array values', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'TAGS',
        table_name: 'md_tags',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [{ id: 1, tags: ['tag1', 'tag2'] }],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Tags'], context);

      // Assert
      expect(result).toEqual([{ id: 1, tags: ['tag1', 'tag2'] }]);
    });

    it('should handle records with null values', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'DATA',
        table_name: 'md_data',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [{ id: 1, optional_field: null }],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Data'], context);

      // Assert
      expect(result).toEqual([{ id: 1, optional_field: null }]);
    });

    it('should convert Prisma Decimal objects to plain numbers', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'VENDORS',
        table_name: 'md_vendors',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [
          {
            id: 1,
            vendor_name: 'Test Vendor',
            score: new Decimal(100),
            rating: new Decimal(4.5),
          },
          {
            id: 2,
            vendor_name: 'Another Vendor',
            score: new Decimal(85),
            rating: new Decimal(3.8),
          },
        ],
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Vendor List'], context);

      // Assert
      expect(result).toEqual([
        { id: 1, vendor_name: 'Test Vendor', score: 100, rating: 4.5 },
        { id: 2, vendor_name: 'Another Vendor', score: 85, rating: 3.8 },
      ]);
      // Verify they are actual numbers, not Decimal objects
      expect(typeof result[0].score).toBe('number');
      expect(typeof result[0].rating).toBe('number');
    });

    it('should handle nested Decimal objects', async () => {
      // Arrange
      const context: ExecutionContext = {};
      mockMasterDataRecordService.getDefinitionByName.mockResolvedValueOnce({
        code: 'STATS',
        table_name: 'md_stats',
        fields: [],
      });
      mockMasterDataRecordService.findRecords.mockResolvedValueOnce({
        items: [
          {
            id: 1,
            stats: {
              min_value: new Decimal(10),
              max_value: new Decimal(100),
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      // Act
      const result = await executor.execute(['Stats'], context);

      // Assert
      expect(result).toEqual([
        { id: 1, stats: { min_value: 10, max_value: 100 } },
      ]);
    });
  });
});
