import { z } from 'zod'

import { createAttribute } from '@coltorapps/builder'

export const expressionAttribute = createAttribute({
  name: 'expression',
  validate(value) {
    return z
      .preprocess(
        (val) => (typeof val === "string" ? val : ""),
        z.string().trim().min(1, "Expression is required"),
      )
      .parse(value)
  },
})
