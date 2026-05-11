import { ZodError } from "zod";

import {
  evaluateEntityRuntimeStatusCodes,
  resolveRuntimeHidden,
} from "@/hooks/useEntityRuntimeStatus";
import type { FormSchema } from "@/types/domain";

function isEmptyRequiredValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "object" && "value" in value) {
    return isEmptyRequiredValue((value as { value?: unknown }).value);
  }
  return false;
}

export function getDynamicRequiredErrors({
  schema,
  values,
  executeCode,
}: {
  schema: FormSchema;
  values: Record<string, unknown>;
  executeCode: (code: string) => unknown;
}): Record<string, string> {
  return Object.entries(schema.entities).reduce<Record<string, string>>(
    (errors, [entityId, entity]) => {
      const attributes = entity.attributes as Record<string, unknown>;
      const value = values[entityId];
      const codes = evaluateEntityRuntimeStatusCodes(
        { id: entityId, value, attributes },
        executeCode,
      );
      const hidden = resolveRuntimeHidden(attributes.hide, codes);
      const required = Boolean(attributes.required) || codes.includes("RQ");

      if (!hidden && required && isEmptyRequiredValue(value)) {
        errors[entityId] = "This field is required";
      }

      return errors;
    },
    {},
  );
}

export function buildZodErrors(
  validatorErrors: Record<string, string>,
): Record<string, ZodError> {
  return Object.entries(validatorErrors).reduce(
    (acc, [entityId, message]) => {
      acc[entityId] = new ZodError([{ code: "custom", message, path: [] }]);
      return acc;
    },
    {} as Record<string, ZodError>,
  );
}
