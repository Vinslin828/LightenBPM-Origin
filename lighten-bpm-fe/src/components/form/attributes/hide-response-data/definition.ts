import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const hideResponseDataAttribute = createAttribute({
  name: "hideResponseData",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
