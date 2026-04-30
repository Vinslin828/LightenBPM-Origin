import { z } from 'zod'

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.enum(['en', 'zh-TW', 'zh-CN']).default('en'),
  autoSave: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
  apiEndpoint: z.string().url().optional(),
  debugMode: z.boolean().default(false),
})

export const CounterSettingsSchema = z.object({
  initialValue: z.number().default(0),
  step: z.number().default(1),
  min: z.number().optional(),
  max: z.number().optional(),
})

export type AppSettings = z.infer<typeof AppSettingsSchema>
export type CounterSettings = z.infer<typeof CounterSettingsSchema>
