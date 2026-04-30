import { z } from 'zod'
import { createAttribute } from '@coltorapps/builder'

export const inputOptionsAttribute = createAttribute({
  name: 'inputOptions',
  validate(value) {
    return z.enum(['default', 'disabled', 'readonly']).parse(value)
  },
})
