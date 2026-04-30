import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const widthAttribute = createAttribute({
  name: 'width',
  validate(value) {
    return z.int().min(1).max(12).default(12).parse(value)
  },
})
