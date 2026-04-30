/**
 * Form Schema Resolver Service
 *
 * Resolves reference values in form schema by recursively traversing all attributes
 * and finding objects with { isReference: true, reference: "..." } pattern.
 * Executes the reference expressions and adds the resolved values.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ExpressionEvaluatorService } from './expression-evaluator.service';
import { ExecutionContext } from '../types';
import { FormSchema } from '../../types/form-schema.types';
import { isReferenceValue } from '../../shared/form/form-utils';

@Injectable()
export class FormSchemaResolverService {
  private readonly logger = new Logger(FormSchemaResolverService.name);

  constructor(
    private readonly expressionEvaluator: ExpressionEvaluatorService,
  ) {}

  /**
   * Resolve all reference values in a form schema
   *
   * @param formSchema - The original form schema
   * @param context - Execution context containing formData, applicantId, workflowInstanceId
   * @returns A deep copy of the schema with all references resolved
   */
  async resolveFormSchema(
    formSchema: FormSchema,
    context: ExecutionContext,
  ): Promise<FormSchema> {
    // Deep copy to avoid mutating the original
    const resolvedSchema = JSON.parse(JSON.stringify(formSchema)) as FormSchema;

    // Resolve references in each entity
    for (const entity of Object.values(resolvedSchema.entities || {})) {
      await this.resolveEntityAttributes(
        entity.attributes as unknown as Record<string, unknown>,
        context,
      );
    }

    return resolvedSchema;
  }

  /**
   * Recursively resolve reference values in entity attributes
   * Traverses all nested objects and arrays to find { isReference: true, reference: "..." }
   */
  private async resolveEntityAttributes(
    obj: unknown,
    context: ExecutionContext,
    path: string = '',
  ): Promise<void> {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    // If this object is a reference value, resolve it
    if (isReferenceValue(obj)) {
      try {
        const result = await this.expressionEvaluator.evaluate(
          obj.reference,
          context,
        );

        if (result.success) {
          obj.value = result.value;
        } else {
          this.logger.warn(
            `Failed to resolve reference at ${path}: ${result.error}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Exception while resolving reference at ${path}: ${(error as Error).message}`,
        );
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        await this.resolveEntityAttributes(obj[i], context, `${path}[${i}]`);
      }
      return;
    }

    // Handle objects - recursively process all properties
    for (const [key, value] of Object.entries(obj)) {
      await this.resolveEntityAttributes(
        value,
        context,
        path ? `${path}.${key}` : key,
      );
    }
  }
}
