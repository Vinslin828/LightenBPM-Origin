/**
 * Unit Tests - FormSchemaResolverService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FormSchemaResolverService } from './form-schema-resolver.service';
import { ExpressionEvaluatorService } from './expression-evaluator.service';
import { ExecutionContext } from '../types/execution-context';
import { FormSchema } from '../../types/form-schema.types';

describe('FormSchemaResolverService', () => {
  let service: FormSchemaResolverService;
  let mockExpressionEvaluator: {
    evaluate: jest.Mock;
  };

  beforeEach(async () => {
    mockExpressionEvaluator = {
      evaluate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormSchemaResolverService,
        {
          provide: ExpressionEvaluatorService,
          useValue: mockExpressionEvaluator,
        },
      ],
    }).compile();

    service = module.get<FormSchemaResolverService>(FormSchemaResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveFormSchema', () => {
    describe('success cases', () => {
      it('should resolve reference values in defaultValue', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'jobGrade',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().jobGrade',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 'Senior',
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).toHaveBeenCalledWith(
          'getApplicantProfile().jobGrade',
          context,
        );
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().jobGrade',
          value: 'Senior',
        });
      });

      it('should resolve reference values in placeholder', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'amount',
                placeholder: {
                  isReference: true,
                  reference: 'getFormField("defaultAmount").value',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          formData: { defaultAmount: 1000 },
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 1000,
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities['field-1'].attributes.placeholder).toEqual({
          isReference: true,
          reference: 'getFormField("defaultAmount").value',
          value: 1000,
        });
      });

      it('should resolve reference values in label', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                label: {
                  isReference: true,
                  reference: 'getApplicantProfile().department',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 'IT Department',
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities['field-1'].attributes.label).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().department',
          value: 'IT Department',
        });
      });

      it('should not modify non-reference values', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'staticField',
                defaultValue: 'static value',
                placeholder: 'Enter value',
                label: 'Field Label',
              },
            },
          },
        };

        const context: ExecutionContext = { formData: {} };

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).not.toHaveBeenCalled();
        expect(result.entities['field-1'].attributes.defaultValue).toBe(
          'static value',
        );
        expect(result.entities['field-1'].attributes.placeholder).toBe(
          'Enter value',
        );
        expect(result.entities['field-1'].attributes.label).toBe('Field Label');
      });

      it('should resolve multiple entities', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1', 'field-2'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field1',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().name',
                },
              },
            },
            'field-2': {
              type: 'input',
              attributes: {
                name: 'field2',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().email',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate
          .mockResolvedValueOnce({ success: true, value: 'John Doe' })
          .mockResolvedValueOnce({ success: true, value: 'john@example.com' });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).toHaveBeenCalledTimes(2);
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().name',
          value: 'John Doe',
        });
        expect(result.entities['field-2'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().email',
          value: 'john@example.com',
        });
      });

      it('should resolve nested reference in dropdown datasourceType.defaultValue', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['dropdown-1'],
          entities: {
            'dropdown-1': {
              type: 'dropdown',
              attributes: {
                name: 'select_o0u6fh',
                label: {
                  value: 'Dropdown Field',
                },
                width: 12,
                required: false,
                placeholder: 'Select an option',
                datasourceType: {
                  type: 'static',
                  options: [
                    { key: 'option_1', label: 'Option 1', value: 'option1' },
                    { key: 'option_2', label: 'Option 2', value: 'option2' },
                  ],
                  defaultValue: {
                    reference: 'getFormField("select_sv3iih").value',
                    isReference: true,
                  },
                },
                selectAdvancedSetting: {
                  searchInOptions: false,
                  multipleSelection: true,
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          formData: { select_sv3iih: 'option1' },
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 'option1',
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).toHaveBeenCalledWith(
          'getFormField("select_sv3iih").value',
          context,
        );
        const datasourceType = result.entities['dropdown-1'].attributes
          .datasourceType as {
          defaultValue: {
            isReference: boolean;
            reference: string;
            value?: string;
          };
        };
        expect(datasourceType.defaultValue).toEqual({
          reference: 'getFormField("select_sv3iih").value',
          isReference: true,
          value: 'option1',
        });
      });

      it('should resolve references in array items', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'table',
              attributes: {
                name: 'table_field',
                columns: [
                  {
                    key: 'col1',
                    label: {
                      isReference: true,
                      reference: 'getApplicantProfile().department',
                    },
                  },
                  {
                    key: 'col2',
                    label: 'Static Label',
                  },
                ],
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 'IT Department',
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).toHaveBeenCalledTimes(1);
        const columns = result.entities['field-1'].attributes.columns as Array<{
          key: string;
          label: unknown;
        }>;
        expect(columns[0].label).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().department',
          value: 'IT Department',
        });
        expect(columns[1].label).toBe('Static Label');
      });

      it('should not mutate the original schema', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().name',
                },
              },
            },
          },
        };

        const originalDefaultValue =
          formSchema.entities['field-1'].attributes.defaultValue;

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: true,
          value: 'Resolved Value',
        });

        // Act
        await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(formSchema.entities['field-1'].attributes.defaultValue).toEqual(
          originalDefaultValue,
        );
      });
    });

    describe('error handling', () => {
      it('should leave value undefined when resolution fails', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().nonexistent',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockResolvedValue({
          success: false,
          error: 'Property nonexistent does not exist',
        });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().nonexistent',
        });
      });

      it('should leave value undefined when executor throws exception', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().name',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate.mockRejectedValue(
          new Error('Unexpected error'),
        );

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().name',
        });
      });

      it('should continue resolving other fields when one fails', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: {
                  isReference: true,
                  reference: 'getApplicantProfile().invalid',
                },
                placeholder: {
                  isReference: true,
                  reference: 'getApplicantProfile().name',
                },
              },
            },
          },
        };

        const context: ExecutionContext = {
          applicantId: 1,
          formData: {},
        };

        mockExpressionEvaluator.evaluate
          .mockResolvedValueOnce({ success: false, error: 'Failed' })
          .mockResolvedValueOnce({ success: true, value: 'John' });

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().invalid',
        });
        expect(result.entities['field-1'].attributes.placeholder).toEqual({
          isReference: true,
          reference: 'getApplicantProfile().name',
          value: 'John',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty entities', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: [],
          entities: {},
        };

        const context: ExecutionContext = { formData: {} };

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(result.entities).toEqual({});
        expect(mockExpressionEvaluator.evaluate).not.toHaveBeenCalled();
      });

      it('should handle attributes without resolvable fields', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                required: true,
              },
            },
          },
        };

        const context: ExecutionContext = { formData: {} };

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).not.toHaveBeenCalled();
        expect(result.entities['field-1'].attributes.name).toBe('field');
        expect(result.entities['field-1'].attributes.required).toBe(true);
      });

      it('should not treat objects without isReference as references', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: { someKey: 'someValue' },
              },
            },
          },
        };

        const context: ExecutionContext = { formData: {} };

        // Act
        const result = await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).not.toHaveBeenCalled();
        expect(result.entities['field-1'].attributes.defaultValue).toEqual({
          someKey: 'someValue',
        });
      });

      it('should not treat objects with isReference=false as references', async () => {
        // Arrange
        const formSchema: FormSchema = {
          root: ['field-1'],
          entities: {
            'field-1': {
              type: 'input',
              attributes: {
                name: 'field',
                defaultValue: { isReference: false, reference: 'test' },
              },
            },
          },
        };

        const context: ExecutionContext = { formData: {} };

        // Act
        await service.resolveFormSchema(formSchema, context);

        // Assert
        expect(mockExpressionEvaluator.evaluate).not.toHaveBeenCalled();
      });
    });
  });
});
