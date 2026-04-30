import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const maxAttribute = createAttribute({
  name: 'max',
  validate(value) {
    return z.number().optional().parse(value)
  },
})
