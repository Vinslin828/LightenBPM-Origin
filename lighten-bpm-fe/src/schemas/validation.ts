import { z } from 'zod'

export const UserInputSchema = z.object({
  count: z.number().int().min(0),
  message: z.string().min(1).max(100),
})

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.string().optional(),
})

export type UserInput = z.infer<typeof UserInputSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
