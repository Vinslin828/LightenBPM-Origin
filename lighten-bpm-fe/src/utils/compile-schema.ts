import { FormSchema } from "@/types/domain";

export default function compileSchema(
  formSchema: FormSchema,
  compileReference: (input: string) => unknown,
): FormSchema {
  const schemaClone = JSON.parse(JSON.stringify(formSchema)) as FormSchema;
  const resolveReferenceValue = (input: unknown) => {
    if (!input || typeof input !== "object" || !("isReference" in input)) {
      return input;
    }
    const ref = input as {
      isReference?: boolean;
      value?: unknown;
      reference?: unknown;
    };
    if (!ref.isReference) {
      return input;
    }
    const expression =
      typeof ref.reference === "string"
        ? ref.reference.trim()
        : typeof ref.value === "string"
          ? ref.value.trim()
          : "";
    if (!expression) {
      return { isReference: false, value: undefined };
    }
    try {
      const rawResult = compileReference(expression);
      const result = typeof rawResult === "function" ? rawResult() : rawResult;
      console.debug({ result });
      return {
        isReference: false,
        reference: expression,
        value: !!result ? String(result) : result,
      };
    } catch (error) {
      console.warn("Failed to compile reference", error);
      return input;
    }
  };

  Object.values(schemaClone.entities).forEach((entity) => {
    const attributes = entity.attributes as Record<string, unknown>;
    if (attributes.label) {
      attributes.label = resolveReferenceValue(attributes.label);
    }
    if (attributes.placeholder) {
      attributes.placeholder = resolveReferenceValue(attributes.placeholder);
    }
    if (attributes.defaultValue) {
      attributes.defaultValue = resolveReferenceValue(attributes.defaultValue);
    }
    const datasource = attributes.datasourceType as
      | {
          type: "static";
          defaultValue?:
            | string
            | string[]
            | { isReference: boolean; value?: string | string[] };
        }
      | { type: "table" }
      | undefined;
    if (datasource?.type === "static" && datasource.defaultValue) {
      const resolvedDefault = resolveReferenceValue(datasource.defaultValue) as
        | { isReference: boolean; value?: string | string[] }
        | string
        | string[]
        | undefined;
      if (
        resolvedDefault &&
        typeof resolvedDefault === "object" &&
        "isReference" in resolvedDefault
      ) {
        datasource.defaultValue = resolvedDefault.value;
      } else {
        datasource.defaultValue = resolvedDefault;
      }
    }
  });

  console.debug({ schemaClone });
  return schemaClone;
}
