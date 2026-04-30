import { z } from 'zod'

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
  avatar: z.string().url().optional(),
})

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  user: UserSchema.optional(),
  token: z.string().optional(),
  message: z.string().optional(),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type User = z.infer<typeof UserSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
