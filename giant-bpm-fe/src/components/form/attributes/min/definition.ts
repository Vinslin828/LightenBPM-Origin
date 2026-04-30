import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const minAttribute = createAttribute({
  name: 'min',
  validate(value) {
    return z.number().optional().parse(value)
  },
})
