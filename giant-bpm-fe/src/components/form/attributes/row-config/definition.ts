import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

const rowConfigSchema = z
  .object({
    minRows: z.number().int().min(0).optional(),
    maxRows: z.number().int().min(0).optional(),
  })
  .refine(
    ({ minRows, maxRows }) =>
      minRows === undefined || maxRows === undefined || maxRows >= minRows,
    {
      message: "Max Rows must be greater than or equal to Min Rows",
      path: ["maxRows"],
    },
  )
  .optional();

export const rowConfigAttribute = createAttribute({
  name: "rowConfig",
  validate(value) {
    return rowConfigSchema.parse(value);
  },
});
