import { z } from "zod";
import { Validator, ValidatorType } from "@/types/validator";
import { EntityKey } from "@/types/form-builder";
import { transformPaginatedResponse } from "../shared";

export const validatorResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullish(),
      validationType: z.enum(["CODE", "API"]).nullish().default("CODE"),
      validationCode: z.string().nullish(),
      // TODO: waiting for design
      apiConfig: z.any().nullable(),
      errorMessage: z.string().nullable(),
      isActive: z.boolean(),
      isComplete: z.boolean().nullish(),
      createdBy: z.number(),
      updatedBy: z.number(),
      createdAt: z.number(),
      updatedAt: z.number().optional(),
      components: z.array(z.string()),
    }),
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export function tValidator(
  item: z.infer<typeof validatorResponseSchema>["items"][number],
): Validator {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    type:
      item.validationType === "API" ? ValidatorType.Api : ValidatorType.Code,
    data: {
      code: item.validationCode ?? "",
      // TODO:
      listens: [],
      isApi: item.validationType === "API",
    },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    components: item.components as EntityKey[],
    errorMessage: item.errorMessage ?? "",
  };
}

export function tValidatorList(data: z.infer<typeof validatorResponseSchema>) {
  return transformPaginatedResponse(data, tValidator);
}
