import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const datasourceTypeAttribute = createAttribute({
  name: "datasourceType",
  validate(value) {
    const staticDefaultValueSchema = z.preprocess(
      (val) => {
        if (val && typeof val === "object" && "isReference" in val) {
          return val;
        }
        if (Array.isArray(val)) {
          return { isReference: false, value: val };
        }
        if (typeof val === "string") {
          return { isReference: true, reference: val };
        }
        if (val === undefined || val === null) {
          return { isReference: false, value: undefined };
        }
        return val;
      },
      z.union([
        z.object({
          isReference: z.boolean(),
          reference: z.string().optional(),
          value: z.union([z.string(), z.array(z.string())]).optional(),
        }),
        z.object({
          isReference: z.boolean(),
          value: z.union([z.string(), z.array(z.string())]).optional(),
        }),
      ]),
    );
    const staticSchema = z.object({
      type: z.literal("static"),
      options: z
        .array(
          z.object({
            label: z.string().max(255),
            value: z.string().max(255),
            key: z.string().max(255),
          }),
        )
        .min(1, "At least one option is required"),
      defaultValue: staticDefaultValueSchema.optional(),
    });

    const filterExpressionSchema = z.object({
      isReference: z.boolean(),
      expression: z.string().optional(),
    });
    const filterUiSchema = z.object({
      isReference: z.boolean(),
      columnKey: z.string().optional(),
      operator: z
        .enum([
          ">",
          "<",
          "==",
          "!=",
          ">=",
          "<=",
          "contains",
          "not_contains",
          "equals",
          "not_equals",
        ])
        .optional(),
      formField: z.string().optional(),
    });

    const dynamicDefaultValueSchema = z
      .object({
        isReference: z.boolean(),
        reference: z.string().optional(),
        value: z.union([z.string(), z.array(z.string())]).optional(),
      })
      .optional();

    const dynamicSchema = z.object({
      type: z.literal("dynamic"),
      table: z
        .object({
          tableKey: z.string().nullable(),
          labelKey: z.string().nullable(),
          valueKey: z.string().nullable(),
        })
        .optional(),
      sorter: z
        .object({
          columnKey: z.string().optional(),
          order: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
      filter: z.union([filterUiSchema, filterExpressionSchema]).optional(),
      defaultValue: dynamicDefaultValueSchema,
    });
    return z
      .discriminatedUnion("type", [staticSchema, dynamicSchema])
      .parse(value);
  },
});
