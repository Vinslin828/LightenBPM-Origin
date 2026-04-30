import { BadRequestException } from '@nestjs/common';
import { MasterDataUtils } from './utils';
import { FieldType } from './dto/create-dataset.dto';

describe('MasterDataUtils', () => {
  describe('validateIdentifier', () => {
    it('should allow valid identifiers', () => {
      expect(() => MasterDataUtils.validateIdentifier('vendors')).not.toThrow();
      expect(() =>
        MasterDataUtils.validateIdentifier('vendor_name'),
      ).not.toThrow();
      expect(() => MasterDataUtils.validateIdentifier('v123')).not.toThrow();
    });

    it('should throw for invalid identifiers', () => {
      expect(() => MasterDataUtils.validateIdentifier('123vendor')).toThrow(
        BadRequestException,
      );
      expect(() => MasterDataUtils.validateIdentifier('vendor-name')).toThrow(
        BadRequestException,
      );
      expect(() => MasterDataUtils.validateIdentifier('Vendor')).toThrow(
        BadRequestException,
      );
      expect(() => MasterDataUtils.validateIdentifier('vendor space')).toThrow(
        BadRequestException,
      );
      expect(() => MasterDataUtils.validateIdentifier('; DROP TABLE')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('quoteIdentifier', () => {
    it('should quote valid identifiers', () => {
      expect(MasterDataUtils.quoteIdentifier('vendors')).toBe('"vendors"');
    });

    it('should throw and not quote invalid identifiers', () => {
      expect(() => MasterDataUtils.quoteIdentifier(';')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMasterDataSchemaName', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return master_data when DB_SCHEMA is not set', () => {
      delete process.env.DB_SCHEMA;
      expect(MasterDataUtils.getMasterDataSchemaName()).toBe('master_data');
    });

    it('should return master_data when DB_SCHEMA is public', () => {
      process.env.DB_SCHEMA = 'public';
      expect(MasterDataUtils.getMasterDataSchemaName()).toBe('master_data');
    });

    it('should return dev_master_data when DB_SCHEMA is dev', () => {
      process.env.DB_SCHEMA = 'dev';
      expect(MasterDataUtils.getMasterDataSchemaName()).toBe('dev_master_data');
    });

    it('should return uat_master_data when DB_SCHEMA is uat', () => {
      process.env.DB_SCHEMA = 'uat';
      expect(MasterDataUtils.getMasterDataSchemaName()).toBe('uat_master_data');
    });
  });

  describe('getFullTableName', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should prepend dynamic schema for md_ tables', () => {
      process.env.DB_SCHEMA = 'dev';
      expect(MasterDataUtils.getFullTableName('md_vendors')).toBe(
        '"dev_master_data"."md_vendors"',
      );
    });

    it('should not prepend schema for non-md_ tables', () => {
      expect(MasterDataUtils.getFullTableName('vendors')).toBe('"vendors"');
    });
  });

  describe('isSameSchema', () => {
    const base = { name: 'col', type: FieldType.TEXT, required: false };

    it('returns true for identical arrays', () => {
      const a = [{ ...base }];
      const b = [{ ...base }];
      expect(MasterDataUtils.isSameSchema(a, b)).toBe(true);
    });

    it('returns false when lengths differ', () => {
      expect(MasterDataUtils.isSameSchema([{ ...base }], [])).toBe(false);
    });

    it('returns false when name differs', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, name: 'col_a' }],
          [{ ...base, name: 'col_b' }],
        ),
      ).toBe(false);
    });

    it('returns false when type differs', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, type: FieldType.TEXT }],
          [{ ...base, type: FieldType.NUMBER }],
        ),
      ).toBe(false);
    });

    it('returns false when required differs', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, required: true }],
          [{ ...base, required: false }],
        ),
      ).toBe(false);
    });

    it('treats undefined unique as false', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, unique: undefined }],
          [{ ...base, unique: false }],
        ),
      ).toBe(true);
    });

    it('treats undefined default_value as null', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, default_value: undefined }],
          [{ ...base, default_value: undefined }],
        ),
      ).toBe(true);
    });

    it('returns false when default_value differs', () => {
      expect(
        MasterDataUtils.isSameSchema(
          [{ ...base, default_value: 'a' }],
          [{ ...base, default_value: 'b' }],
        ),
      ).toBe(false);
    });

    it('returns false when order differs', () => {
      const col1 = { name: 'col1', type: FieldType.TEXT, required: false };
      const col2 = { name: 'col2', type: FieldType.TEXT, required: false };
      expect(MasterDataUtils.isSameSchema([col1, col2], [col2, col1])).toBe(
        false,
      );
    });
  });

  describe('recordsToCsv', () => {
    const fields = [
      { name: 'name', type: FieldType.TEXT, required: true },
      { name: 'score', type: FieldType.NUMBER, required: false },
      { name: 'active', type: FieldType.BOOLEAN, required: false },
    ];

    it('produces a header row followed by data rows', () => {
      const rows = [{ name: 'Alice', score: 95, active: true }];
      const csv = MasterDataUtils.recordsToCsv(fields, rows);
      expect(csv).toBe('name,score,active\r\nAlice,95,true');
    });

    it('renders empty string for null/undefined values', () => {
      const rows = [{ name: null, score: undefined, active: false }];
      const csv = MasterDataUtils.recordsToCsv(fields, rows);
      expect(csv).toBe('name,score,active\r\n,,false');
    });

    it('quotes values containing commas', () => {
      const rows = [{ name: 'Smith, John', score: 80, active: true }];
      const csv = MasterDataUtils.recordsToCsv(fields, rows);
      expect(csv).toBe('name,score,active\r\n"Smith, John",80,true');
    });

    it('escapes double-quotes by doubling them', () => {
      const rows = [{ name: 'say "hello"', score: 0, active: false }];
      const csv = MasterDataUtils.recordsToCsv(fields, rows);
      expect(csv).toBe('name,score,active\r\n"say ""hello""",0,false');
    });

    it('returns only the header row when rows array is empty', () => {
      const csv = MasterDataUtils.recordsToCsv(fields, []);
      expect(csv).toBe('name,score,active');
    });
  });

  describe('parseCsv', () => {
    it('parses a simple CSV buffer into headers and rows', () => {
      const buf = Buffer.from('name,score\r\nAlice,95\r\nBob,80');
      const { headers, rows } = MasterDataUtils.parseCsv(buf);
      expect(headers).toEqual(['name', 'score']);
      expect(rows).toEqual([
        { name: 'Alice', score: '95' },
        { name: 'Bob', score: '80' },
      ]);
    });

    it('handles CRLF and LF line endings', () => {
      const buf = Buffer.from('a,b\nX,1\r\nY,2');
      const { rows } = MasterDataUtils.parseCsv(buf);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ a: 'X', b: '1' });
    });

    it('handles trailing newline without creating a phantom row', () => {
      const buf = Buffer.from('a,b\n1,2\n');
      const { rows } = MasterDataUtils.parseCsv(buf);
      expect(rows).toHaveLength(1);
    });

    it('unquotes quoted fields', () => {
      const buf = Buffer.from('a,b\n"hello, world","it\'s fine"');
      const { rows } = MasterDataUtils.parseCsv(buf);
      expect(rows[0]).toEqual({ a: 'hello, world', b: "it's fine" });
    });

    it('un-doubles escaped quotes inside quoted fields', () => {
      const buf = Buffer.from('a\n"say ""hi"""');
      const { rows } = MasterDataUtils.parseCsv(buf);
      expect(rows[0]).toEqual({ a: 'say "hi"' });
    });

    it('returns empty headers and rows for an empty buffer', () => {
      const { headers, rows } = MasterDataUtils.parseCsv(Buffer.from(''));
      expect(headers).toEqual([]);
      expect(rows).toEqual([]);
    });

    it('returns headers with no rows when only header line is present', () => {
      const { headers, rows } = MasterDataUtils.parseCsv(
        Buffer.from('col1,col2'),
      );
      expect(headers).toEqual(['col1', 'col2']);
      expect(rows).toHaveLength(0);
    });
  });
});
