import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { createAttribute } from "@coltorapps/builder";

const flowTypeSchema = z.enum(["split", "recursive", "others"]);
const dateSubtypeSchema = z.enum(["date", "time", "datetime"]);

const baseHeaderSchema = z.object({
  label: z.string().min(1),
  keyValue: z.string().min(1),
  key: z.string(),
  flowType: z.array(flowTypeSchema).optional(),
});

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

const staticDatasourceSchema = z.object({
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

const dynamicDatasourceSchema = z.object({
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
});

const datasourceSchema = z.discriminatedUnion("type", [
  staticDatasourceSchema,
  dynamicDatasourceSchema,
]);

const inputSchema = baseHeaderSchema.extend({
  type: z.literal("input"),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().optional().default(false),
});

const numberSchema = baseHeaderSchema.extend({
  type: z.literal("number"),
  placeholder: z.string().optional(),
  defaultValue: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().optional()),
  required: z.boolean().optional().default(false),
});

const dateSchema = baseHeaderSchema.extend({
  type: z.literal("date"),
  placeholder: z.string().optional(),
  subtype: dateSubtypeSchema,
  defaultValue: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().optional()),
  required: z.boolean().optional().default(false),
});

const dropdownSchema = baseHeaderSchema.extend({
  type: z.literal("dropdown"),
  placeholder: z.string().optional(),
  required: z.boolean().optional().default(false),
  datasource: datasourceSchema.optional(),
});

const gridHeaderItemSchema = z.discriminatedUnion("type", [
  inputSchema,
  numberSchema,
  dateSchema,
  dropdownSchema,
]);

const gridHeaderArraySchema = z
  .array(gridHeaderItemSchema)
  .min(1)
  .superRefine((headers, ctx) => {
    const seen = new Map<string, number>();

    headers.forEach((header, index) => {
      const normalizedKeyValue = header.keyValue.trim();
      const duplicateAt = seen.get(normalizedKeyValue);

      if (duplicateAt === undefined) {
        seen.set(normalizedKeyValue, index);
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [duplicateAt, "keyValue"],
        message: `Duplicate column keyValue: "${normalizedKeyValue}"`,
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "keyValue"],
        message: `Duplicate column keyValue: "${normalizedKeyValue}"`,
      });
    });
  });

export const gridHeaderAttribute = createAttribute({
  name: "gridHeaders",
  validate(value) {
    const normalizedValue = z.preprocess((val) => {
      if (!Array.isArray(val)) return val;

      return val.map((item, index) => {
        if (typeof item === "string") {
          const label = item.trim() || `Column ${index + 1}`;
          return {
            label,
            keyValue: `column_${index + 1}`,
            key: uuidv4(),
            type: "input",
            placeholder: "",
            defaultValue: "",
            required: false,
            flowType: ["split"],
          };
        }

        if (!item || typeof item !== "object") {
          return {
            label: `Column ${index + 1}`,
            keyValue: `column_${index + 1}`,
            key: uuidv4(),
            type: "input",
            placeholder: "",
            defaultValue: "",
            required: false,
            flowType: ["split"],
          };
        }

        const record = item as Record<string, unknown>;
        const rawLabel = record.label;
        const rawKey = record.key;
        const rawKeyValue = record.keyValue;
        const type =
          typeof record.type === "string" &&
          ["input", "number", "date", "dropdown"].includes(record.type)
            ? record.type
            : "input";

        return {
          label:
            typeof rawLabel === "string" && rawLabel.trim().length > 0
              ? rawLabel
              : `Column ${index + 1}`,
          keyValue:
            typeof rawKeyValue === "string" && rawKeyValue.trim().length > 0
              ? rawKeyValue
              : `column_${index + 1}`,
          key:
            typeof rawKey === "string" && rawKey.trim().length > 0
              ? rawKey
              : uuidv4(),
          type,
          subtype:
            type === "date"
              ? typeof record.subtype === "string" &&
                  ["date", "time", "datetime"].includes(record.subtype)
                ? record.subtype
                : "date"
              : undefined,
          placeholder:
            typeof record.placeholder === "string" ? record.placeholder : "",
          defaultValue:
            record.defaultValue === undefined || record.defaultValue === null
              ? ""
              : String(record.defaultValue),
          required:
            typeof record.required === "boolean" ? record.required : false,
          flowType: Array.isArray(record.flowType)
            ? record.flowType
            : ["split"],
          datasource:
            record.datasource &&
            typeof record.datasource === "object" &&
            "type" in record.datasource
              ? record.datasource
              : undefined,
        };
      });
    }, gridHeaderArraySchema);

    return normalizedValue.parse(value);
  },
});
