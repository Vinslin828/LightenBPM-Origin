import { injectable } from 'inversify'
import { z } from 'zod'
import type { IValidationService } from '../interfaces/services'

@injectable()
export class ValidationService implements IValidationService {
  validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data)
  }

  isValid<T>(schema: z.ZodSchema<T>, data: unknown): boolean {
    try {
      schema.parse(data)
      return true
    } catch {
      return false
    }
  }
}
