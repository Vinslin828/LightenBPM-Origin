import { Test, TestingModule } from '@nestjs/testing';
import { ExpressionEvaluatorService } from './expression-evaluator.service';
import { GetFormFieldExecutor } from '../executors/get-form-field.executor';
import { GetApplicantProfileExecutor } from '../executors/get-applicant-profile.executor';
import { GetApplicationExecutor } from '../executors/get-application.executor';
import { GetMasterDataExecutor } from '../executors/get-master-data.executor';
import { GetCurrentNodeExecutor } from '../executors/get-current-node.executor';
import { FetchExecutor } from '../executors/fetch.executor';
import { ExecutionContext } from '../types/execution-context';

describe('ExpressionEvaluatorService', () => {
  let service: ExpressionEvaluatorService;
  let mockGetFormFieldExecutor: jest.Mocked<GetFormFieldExecutor>;
  let mockGetApplicantProfileExecutor: jest.Mocked<GetApplicantProfileExecutor>;
  let mockGetApplicationExecutor: jest.Mocked<GetApplicationExecutor>;
  let mockGetMasterDataExecutor: jest.Mocked<GetMasterDataExecutor>;
  let mockFetchExecutor: jest.Mocked<FetchExecutor>;

  beforeEach(async () => {
    mockGetFormFieldExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetFormFieldExecutor>;

    mockGetApplicantProfileExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetApplicantProfileExecutor>;

    mockGetApplicationExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetApplicationExecutor>;

    mockGetMasterDataExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMasterDataExecutor>;

    mockFetchExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FetchExecutor>;

    const mockGetCurrentNodeExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentNodeExecutor>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpressionEvaluatorService,
        {
          provide: GetFormFieldExecutor,
          useValue: mockGetFormFieldExecutor,
        },
        {
          provide: GetApplicantProfileExecutor,
          useValue: mockGetApplicantProfileExecutor,
        },
        {
          provide: GetApplicationExecutor,
          useValue: mockGetApplicationExecutor,
        },
        {
          provide: GetMasterDataExecutor,
          useValue: mockGetMasterDataExecutor,
        },
        {
          provide: GetCurrentNodeExecutor,
          useValue: mockGetCurrentNodeExecutor,
        },
        {
          provide: FetchExecutor,
          useValue: mockFetchExecutor,
        },
      ],
    }).compile();

    service = module.get<ExpressionEvaluatorService>(
      ExpressionEvaluatorService,
    );
  });

  describe('evaluate', () => {
    const context: ExecutionContext = {
      formData: { amount: 5000, name: 'Test' },
      applicantId: 1,
      workflowInstanceId: 100,
    };

    describe('simple expressions', () => {
      it('should evaluate simple getFormField expression', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 5000 });

        const result = await service.evaluate(
          'getFormField("amount").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(5000);
      });

      it('should evaluate getApplicantProfile expression', async () => {
        mockGetApplicantProfileExecutor.execute.mockResolvedValue({
          name: '張三',
          jobGrade: 'Manager',
        });

        const result = await service.evaluate(
          'getApplicantProfile().name',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe('張三');
      });
    });

    describe('comparison expressions', () => {
      it('should evaluate comparison: greater than', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 8000 });

        const result = await service.evaluate(
          'getFormField("amount").value > 5000',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate comparison: less than', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 3000 });

        const result = await service.evaluate(
          'getFormField("amount").value < 5000',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate comparison: equal', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 5000 });

        const result = await service.evaluate(
          'getFormField("amount").value == 5000',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });
    });

    describe('ternary expressions', () => {
      it('should evaluate ternary when condition is true', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 8000 });

        const result = await service.evaluate(
          'getFormField("amount").value > 5000 ? "高額" : "一般"',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe('高額');
      });

      it('should evaluate ternary when condition is false', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 3000 });

        const result = await service.evaluate(
          'getFormField("amount").value > 5000 ? "高額" : "一般"',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe('一般');
      });
    });

    describe('string concatenation', () => {
      it('should concatenate strings', async () => {
        mockGetApplicantProfileExecutor.execute.mockResolvedValue({
          name: '張三',
        });

        const result = await service.evaluate(
          'getApplicantProfile().name + " 您好"',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe('張三 您好');
      });

      it('should concatenate multiple strings', async () => {
        mockGetApplicantProfileExecutor.execute.mockResolvedValue({
          name: '張三',
        });
        mockGetFormFieldExecutor.execute.mockResolvedValue({
          value: '辦公用品',
        });

        const result = await service.evaluate(
          'getApplicantProfile().name + " 申請了 " + getFormField("type").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe('張三 申請了 辦公用品');
      });
    });

    describe('logical expressions', () => {
      it('should evaluate logical AND', async () => {
        mockGetFormFieldExecutor.execute
          .mockResolvedValueOnce({ value: 8000 })
          .mockResolvedValueOnce({ value: 3000 });

        const result = await service.evaluate(
          'getFormField("a").value > 5000 && getFormField("b").value < 5000',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate logical OR', async () => {
        mockGetFormFieldExecutor.execute
          .mockResolvedValueOnce({ value: 3000 })
          .mockResolvedValueOnce({ value: 8000 });

        const result = await service.evaluate(
          'getFormField("a").value > 5000 || getFormField("b").value > 5000',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate logical NOT', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: false });

        const result = await service.evaluate(
          '!getFormField("flag").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate double NOT (truthy check)', async () => {
        mockGetFormFieldExecutor.execute.mockResolvedValue({ value: '有值' });

        const result = await service.evaluate(
          '!!getFormField("text").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });
    });

    describe('arithmetic expressions', () => {
      it('should evaluate addition', async () => {
        mockGetFormFieldExecutor.execute
          .mockResolvedValueOnce({ value: 100 })
          .mockResolvedValueOnce({ value: 200 });

        const result = await service.evaluate(
          'getFormField("a").value + getFormField("b").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(300);
      });

      it('should evaluate subtraction', async () => {
        mockGetFormFieldExecutor.execute
          .mockResolvedValueOnce({ value: 500 })
          .mockResolvedValueOnce({ value: 200 });

        const result = await service.evaluate(
          'getFormField("a").value - getFormField("b").value',
          context,
        );

        expect(result.success).toBe(true);
        expect(result.value).toBe(300);
      });
    });

    describe('complex QA test case', () => {
      it('should evaluate the QA test expression', async () => {
        // Arrange
        const fieldValues: Record<string, unknown> = {
          text_purchase_type: '辦公用品',
          number_quantity: 10,
        };
        mockGetFormFieldExecutor.execute.mockImplementation(
          ([fieldId]: string[]) =>
            Promise.resolve({ value: fieldValues[fieldId] }),
        );

        mockGetApplicantProfileExecutor.execute.mockResolvedValue({
          name: '張三',
        });

        const expression = `!!getFormField("text_purchase_type").value || !!getFormField("number_quantity").value
          ? getApplicantProfile().name + "目前請購類別為-" + getFormField("text_purchase_type").value + "採購數量為:" + getFormField("number_quantity").value
          : "無資料"`;

        // Act
        const result = await service.evaluate(expression, context);

        // Assert
        expect(result.success).toBe(true);
        expect(result.value).toBe('張三目前請購類別為-辦公用品採購數量為:10');
      });
    });

    describe('error handling', () => {
      it('should return error for empty expression', async () => {
        const result = await service.evaluate('', context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Expression must be a non-empty string');
      });

      it('should return error for null expression', async () => {
        const result = await service.evaluate(
          null as unknown as string,
          context,
        );

        expect(result.success).toBe(false);
      });

      it('should return error when function executor fails', async () => {
        // Arrange
        mockGetFormFieldExecutor.execute.mockRejectedValue(
          new Error('Field not found'),
        );

        // Act
        const result = await service.evaluate(
          'getFormField("nonexistent").value',
          context,
        );

        // Assert
        // Note: Error messages may not propagate exactly through isolated-vm boundary
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
