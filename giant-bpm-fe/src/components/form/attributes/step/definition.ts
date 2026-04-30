import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const stepAttribute = createAttribute({
  name: 'step',
  validate(value) {
    return z.number().optional().parse(value)
  },
})
