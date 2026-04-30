import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const DATE_SUBTYPE_EVENT = "date-subtype-change";
const DateSubtypeEnum = z.enum(["date", "time", "datetime"]);

export type DateSubtype = z.infer<typeof DateSubtypeEnum>;

export const dateSubtypeAttribute = createAttribute({
  name: "dateSubtype",
  validate(value) {
    if (!value) return "date";
    return DateSubtypeEnum.parse(value);
  },
});
