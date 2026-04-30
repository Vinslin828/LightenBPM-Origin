import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

const currencyCodes = [
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "JPY",
  "KRW",
  "MXN",
  "PLN",
  "THB",
  "TWD",
  "USD",
  "VND",
] as const;

export const currencyCodeAttribute = createAttribute({
  name: "currencyCode",
  validate(value) {
    const referenceSchema = z.object({
      isReference: z.literal(true),
      reference: z.string().optional(),
    });
    const valueSchema = z.object({
      isReference: z.literal(false).optional(),
      value: z.enum(currencyCodes).optional(),
    });
    const preprocess = (val: unknown) => {
      if (val && typeof val === "object" && "isReference" in val) return val;
      if (typeof val === "string" && currencyCodes.includes(val as never)) {
        return { isReference: false, value: val };
      }
      return { isReference: false, value: undefined };
    };
    return z
      .preprocess(preprocess, z.union([referenceSchema, valueSchema]))
      .parse(value);
  },
});
