# How to Add Reference Support to an Attribute

This guide explains how to add "reference mode" to an attribute so users can switch between manual input and a code expression.

## Overview

Reference mode stores the attribute value as an object:

```ts
{
  isReference: boolean;
  reference?: string;
  value?: string | number | boolean | string[] | OptionType[] | undefined;
}
```

Manual mode stores the same shape with `isReference: false` and a typed `value`.
Reference mode stores `isReference: true`, keeps the expression in `reference`,
and can optionally cache a resolved string in `value`.

## Step 1: Update the attribute definition

In the attribute `definition.ts`, change validation to accept the `{ isReference, value }` shape and keep backward compatibility with old values.

Example pattern (string with reference/value split):

```ts
import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const defaultStringValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const referenceSchema = z.object({
      isReference: z.literal(true),
      reference: z.string().optional(),
      value: z.string().optional(),
    });
    const valueSchema = z.object({
      isReference: z.literal(false).optional(),
      value: z.string().min(1).max(255),
    });
    const schema = z.union([referenceSchema, valueSchema]);
    return schema.parse(value);
  },
});
```

Notes:

- Use a union so reference/value have distinct validation rules.
- Use `superRefine` if you need stricter field-specific constraints.

## Step 2: Update the attribute component UI

In the attribute `component.tsx`:

- Add `CodeToggle` (manual / code).
- Use `useCode().validateReference` for reference validation (optional).
- Render the correct input based on `isReference`.

Example structure:

```tsx
const { validateReference } = useCode();
const [expressionError, setExpressionError] = useState<string | undefined>();
const attributeValue = props.attribute.value ?? {
  isReference: false,
  value: undefined,
};

<CodeToggle
  value={attributeValue.isReference ? "code" : "manual"}
  onChange={(value) => {
    setExpressionError(undefined);
    props.setValue({
      isReference: value === "code",
      value: "",
      reference: "",
    });
  }}
/>;

{attributeValue.isReference ? (
  <Input
    value={attributeValue.reference ?? ""}
    onChange={(e) => {
      const result = validateReference(e.target.value);
      setExpressionError(result.isValid ? undefined : result.errors[0]);
      props.setValue({ ...attributeValue, reference: e.target.value });
    }}
  />
) : (
  <Input
    value={attributeValue.value ?? ""}
    onChange={(e) =>
      props.setValue({ isReference: false, value: e.target.value })
    }
  />
)}

<ValidationError>
  {expressionError ?? formatError(...)?._errors?.[0]}
</ValidationError>
```

## Step 3: Update entity component usage

Any component reading `attributes.defaultValue` must handle both:

- legacy type (string/number/boolean/array)
- new `{ isReference, value }` shape

Example (string):

```ts
const defaultValueAttr = props.entity.attributes.defaultValue;
const defaultValue =
  typeof defaultValueAttr === "string"
    ? defaultValueAttr
    : defaultValueAttr &&
        typeof defaultValueAttr === "object" &&
        "value" in defaultValueAttr &&
        typeof (defaultValueAttr as { value?: unknown }).value === "string"
      ? (defaultValueAttr as { value: string }).value
      : "";
```

If `isReference === true`, treat the default as `undefined` unless you are
evaluating expressions at runtime. The expression lives in `reference`.

## Step 4: Update entity definition defaultValue

In the entity `definition.ts`, normalize defaults:

```ts
defaultValue(context) {
  const dv = context.entity.attributes.defaultValue;
  if (dv && typeof dv === "object" && "value" in dv) {
    const val = (dv as { value?: unknown }).value;
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
},
```

## Step 5: Update form builder defaults

In `src/const/form-builder.ts`, set new defaults using the object shape:

```ts
defaultValue: { isReference: false, value: undefined },
```

## Step 6: Optional - Code editor modal

If you want a code editor instead of a plain input, use:

- `CodeEditorModal` and `CodeTextarea`

## Common pitfalls

- **Checkbox uncheck bug**: if you use defaults as fallback, ensure you respect
  empty user values. Check `props.entity.value` for `undefined`/`null` rather
  than `length > 0`.
- **Legacy schemas**: always include `z.preprocess` so old data still parses.
- **Reference mode**: don’t run manual validation rules on reference strings.

## Checklist

- Definition updated to `{ isReference, value }`
- Attribute component renders CodeToggle + validation
- Entity component reads both legacy and new shapes
- Entity definition `defaultValue` normalized
- Form builder defaults updated
