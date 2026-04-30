import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const decimalDigitsAttribute = createAttribute({
  name: 'decimalDigits',
  validate(value) {
    return z.number().int().min(0).max(20).optional().parse(value)
  },
})

export type DecimalDigitsUpdatedDetail = {
  entityId?: string
  value?: number
}
