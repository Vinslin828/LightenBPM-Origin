import { z } from 'zod'
import { createAttribute } from '@coltorapps/builder'

export const inputTypeAttribute = createAttribute({
  name: 'inputType',
  validate(value) {
    return z
      .enum(['text', 'number', 'password', 'date', 'time', 'datetime-local', 'textarea'])
      .parse(value)
  },
})
