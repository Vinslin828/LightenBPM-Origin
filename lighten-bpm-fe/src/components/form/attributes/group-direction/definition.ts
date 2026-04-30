import { z } from 'zod'
import { createAttribute } from '@coltorapps/builder'

export const groupDirectionAttribute = createAttribute({
  name: 'groupDirection',
  validate(value) {
    return z.enum(['horizontal', 'vertical']).optional().parse(value)
  },
})
