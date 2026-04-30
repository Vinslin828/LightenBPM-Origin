import { z } from 'zod'
import { createAttribute } from '@coltorapps/builder'

export const searchInOptionsAttribute = createAttribute({
  name: 'searchInOptions',
  validate(value) {
    return z.boolean().optional().parse(value)
  },
})
