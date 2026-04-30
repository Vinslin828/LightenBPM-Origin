import { z } from 'zod'
import { createAttribute } from '@coltorapps/builder'

export const nameAttribute = createAttribute({
  name: 'name',
  validate(value) {
    return z.string().min(1).max(255).parse(value)
  },
})
