import { FormSchema } from "@/types/domain";

type CodeBinding = {
  name: string;
  value: unknown;
};

export function executeCodeWithBindings(
  code: string,
  bindings: CodeBinding[],
): unknown {
  const argNames = bindings.map((binding) => binding.name);
  const argValues = bindings.map((binding) => binding.value);
  const compiled = new Function(...argNames, `return (${code});`);
  return compiled(...argValues);
}

export function getFieldIdByName(
  entities: FormSchema["entities"],
  fieldName: string,
): string | undefined {
  return (
    Object.entries(entities).find(([, entity]) => {
      const attributes = entity.attributes as Record<string, unknown>;
      return attributes.name === fieldName;
    })?.[0] ??
    (Object.prototype.hasOwnProperty.call(entities, fieldName)
      ? fieldName
      : undefined)
  );
}

export function getFieldNameByIdentifier(
  entities: FormSchema["entities"],
  identifier?: string,
): string | undefined {
  if (!identifier) {
    return identifier;
  }

  const entity = entities[identifier];
  const entityName = (entity?.attributes as Record<string, unknown> | undefined)
    ?.name;
  return typeof entityName === "string" && entityName.trim() !== ""
    ? entityName.trim()
    : identifier;
}

export function toNameKeyedFormData(
  entities: FormSchema["entities"],
  rawFormData?: Record<string, unknown>,
): Record<string, unknown> {
  if (!rawFormData) {
    return {};
  }

  const mappedData: Record<string, unknown> = {};
  Object.entries(rawFormData).forEach(([identifier, value]) => {
    const fieldName = getFieldNameByIdentifier(entities, identifier) ?? identifier;
    mappedData[fieldName] = value;
  });

  return mappedData;
}

export function getSchemaFieldNames(schema: FormSchema): string[] {
  return Object.values(schema.entities)
    .map((entity) => {
      const attributes = entity.attributes as Record<string, unknown>;
      return attributes.name;
    })
    .filter((name): name is string => typeof name === "string");
}

export function extractReferencedFieldNames(code: string): string[] {
  const fieldNames = new Set<string>();
  const getFormFieldRegex = /getFormField\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
  let match: RegExpExecArray | null;

  while ((match = getFormFieldRegex.exec(code)) !== null) {
    fieldNames.add(match[1]);
  }

  return Array.from(fieldNames);
}
