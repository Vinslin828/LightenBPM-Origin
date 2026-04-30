import { FunctionCallExtractor } from './function-call-extractor';

describe('FunctionCallExtractor', () => {
  let extractor: FunctionCallExtractor;

  beforeEach(() => {
    extractor = new FunctionCallExtractor();
  });

  describe('extract', () => {
    describe('simple function calls', () => {
      it('should extract getFormField (property access handled by JS runtime)', () => {
        const result = extractor.extract('getFormField("amount").value');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          functionName: 'getFormField',
          args: ['amount'],
          originalText: 'getFormField("amount")',
        });
      });

      it('should extract getApplicantProfile (property access handled by JS runtime)', () => {
        const result = extractor.extract('getApplicantProfile().name');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          functionName: 'getApplicantProfile',
          args: [],
          originalText: 'getApplicantProfile()',
        });
      });

      it('should extract getApplication (property access handled by JS runtime)', () => {
        const result = extractor.extract('getApplication().serialNumber');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          functionName: 'getApplication',
          args: [],
          originalText: 'getApplication()',
        });
      });

      it('should extract function call without property access', () => {
        const result = extractor.extract('getApplicantProfile()');

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          functionName: 'getApplicantProfile',
          args: [],
          accessedProperty: undefined,
          originalText: 'getApplicantProfile()',
        });
      });
    });

    describe('multiple function calls', () => {
      it('should extract multiple function calls in arithmetic expression', () => {
        const result = extractor.extract(
          'getFormField("a").value + getFormField("b").value',
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          functionName: 'getFormField',
          args: ['a'],
        });
        expect(result[1]).toMatchObject({
          functionName: 'getFormField',
          args: ['b'],
        });
      });

      it('should extract multiple different function calls', () => {
        const result = extractor.extract(
          'getFormField("amount").value > 5000 ? getApplicantProfile().name : "default"',
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          functionName: 'getFormField',
          args: ['amount'],
        });
        expect(result[1]).toMatchObject({
          functionName: 'getApplicantProfile',
          args: [],
        });
      });
    });

    describe('complex expressions', () => {
      it('should extract from ternary expression', () => {
        const result = extractor.extract(
          'getFormField("type").value == "urgent" ? getFormField("priority").value : 0',
        );

        expect(result).toHaveLength(2);
        expect(result[0].args).toEqual(['type']);
        expect(result[1].args).toEqual(['priority']);
      });

      it('should extract from logical expression with double negation', () => {
        const result = extractor.extract(
          '!!getFormField("text_purchase_type").value || !!getFormField("number_quantity").value',
        );

        expect(result).toHaveLength(2);
        expect(result[0].args).toEqual(['text_purchase_type']);
        expect(result[1].args).toEqual(['number_quantity']);
      });

      it('should extract from complex QA test case', () => {
        const expr = `!!getFormField("text_purchase_type").value || !!getFormField("number_quantity").value
          ? getApplicantProfile().name + "目前請購類別為-" + getFormField("text_purchase_type").value + "採購數量為:" + getFormField("number_quantity").value
          : undefined`;

        const result = extractor.extract(expr);

        expect(result).toHaveLength(5);
        expect(result.map((r) => r.functionName)).toEqual([
          'getFormField',
          'getFormField',
          'getApplicantProfile',
          'getFormField',
          'getFormField',
        ]);
      });
    });

    describe('edge cases', () => {
      it('should return empty array for empty string', () => {
        expect(extractor.extract('')).toEqual([]);
      });

      it('should return empty array for null/undefined', () => {
        expect(extractor.extract(null as unknown as string)).toEqual([]);
        expect(extractor.extract(undefined as unknown as string)).toEqual([]);
      });

      it('should return empty array for expression without allowed functions', () => {
        expect(extractor.extract('someOtherFunction("x")')).toEqual([]);
        expect(extractor.extract('1 + 2')).toEqual([]);
        expect(extractor.extract('"hello"')).toEqual([]);
      });

      it('should extract function calls from expression with return statement', () => {
        const result = extractor.extract(
          'const a = getCurrentNode(); return a.nodeKey;',
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          functionName: 'getCurrentNode',
          args: [],
        });
      });

      it('should return empty array for invalid syntax', () => {
        expect(extractor.extract('getFormField("x')).toEqual([]);
        expect(extractor.extract('function {')).toEqual([]);
      });

      it('should ignore disallowed function names', () => {
        const result = extractor.extract(
          'eval("code") + getFormField("amount").value',
        );

        expect(result).toHaveLength(1);
        expect(result[0].functionName).toBe('getFormField');
      });
    });

    describe('position tracking', () => {
      it('should correctly track start and end positions for function call only', () => {
        const expr = 'getFormField("amount").value';
        const result = extractor.extract(expr);

        expect(result).toHaveLength(1);
        expect(result[0].start).toBe(0);
        // Position tracks only the function call, not property access
        expect(result[0].end).toBe('getFormField("amount")'.length);
      });

      it('should track positions for multiple calls', () => {
        const expr = 'getFormField("a").value + getFormField("b").value';
        const result = extractor.extract(expr);

        expect(result).toHaveLength(2);
        expect(result[0].start).toBeLessThan(result[1].start);
        // Position tracks only the function call, not property access
        expect(expr.slice(result[0].start, result[0].end)).toBe(
          'getFormField("a")',
        );
        expect(expr.slice(result[1].start, result[1].end)).toBe(
          'getFormField("b")',
        );
      });
    });
  });
});
