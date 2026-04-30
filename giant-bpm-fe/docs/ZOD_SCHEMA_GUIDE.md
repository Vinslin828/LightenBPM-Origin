# Zod Schema Guide

This document provides a comprehensive guide to creating and using Zod schemas in this project. Adhering to these conventions ensures consistent and reliable runtime data validation.

## 1. Purpose of Zod Schemas

Zod schemas are used as the first line of defense for data entering our application from external sources (e.g., backend APIs). They provide:

- **Runtime Validation**: Ensuring that the data structure matches our expectations before it's used in the application.
- **Type Safety**: Automatically inferring TypeScript types from schemas, which eliminates the need for manual type definitions for API payloads.
- **Data Coercion**: Transforming data into more useful types (e.g., converting date strings into `Date` objects).

## 2. Core Rules for Schema Definition

When defining a new Zod schema, please adhere strictly to the following rules.

### Rule 1: ID Fields

All identifier fields (e.g., `id`, `form_id`, `user_id`) must be defined as plain strings. Do **not** use `.uuid()` or other specialized validators.

```typescript
// Correct
const MySchema = z.object({
  id: z.string(),
  form_id: z.string(),
  user_id: z.string(),
});

// Incorrect (do not add specialized validators)
// const MySchema = z.object({
//   id: z.string().uuid(),
// });
```

### Rule 2: Date-Time Fields

All fields representing a date and time must be defined as plain strings. Do **not** use `.datetime()` or other specialized validators.

```typescript
// Correct
const MySchema = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  effective_date: z.string(),
});

// Incorrect (do not add specialized validators)
// const MySchema = z.object({
//   created_at: z.string().datetime(),
// });
```

### Rule 3: Enum Fields

For fields that correspond to a TypeScript enum, use `z.enum()` with the enum's values.

Given a TypeScript enum:

```typescript
export enum FormStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
  Archived = "ARCHIVED",
}
```

The schema should be defined by passing an array of the enum's string values to `z.enum()`.

```typescript
// Correct
const MySchema = z.object({
  status: z.enum(FormStatus),
});

// Incorrect (as per project rules)
// const MySchema = z.object({
//   status: z.nativeEnum(FormStatus),
// });
```

_Note: While Zod offers `z.nativeEnum()`, the project convention is to use `z.enum()` for explicit validation against the string values._

### Rule 4: Dynamic Object/Record Fields

For fields that are dynamic objects or records with unknown keys, use `z.record(z.string(), z.any())`.

```typescript
// Correct
const MySchema = z.object({
  // A field that can have any string keys and any type of values
  metadata: z.record(z.string(), z.any()),
});
```

## 3. Naming Conventions

- **Schema Definitions**: Use `PascalCaseSchema` (e.g., `FormSchema`, `UserSchema`).
- **Response Types** (in `response.ts`): Use `PascalCaseResponse` for types inferred from schemas (e.g., `FormResponse`, `UserResponse`).
- **Request Types** (in `request.ts`): Use `PascalCaseRequest` for types inferred from schemas (e.g., `CreateFormRequest`, `UpdateUserRequest`).

```typescript
// In response.ts
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type UserResponse = z.infer<typeof UserSchema>;

// In request.ts
export const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string(),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
```

## 4. Complete Example

Here is an example of a `FormSchema` that follows all the rules outlined above.

```typescript
import { z } from "zod";

// Assuming FormStatus enum exists
export enum FormStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
  Archived = "ARCHIVED",
}

// Tag Schema (response.ts)
export const TagSchema = z.object({
  id: z.string(), // Rule 1
  name: z.string(),
  created_at: z.string(), // Rule 2 - plain string, no validators
});

export type TagResponse = z.infer<typeof TagSchema>;

// Form Schema (response.ts)
export const FormSchema = z.object({
  id: z.string(), // Rule 1
  is_active: z.boolean(),
  created_at: z.string(), // Rule 2 - plain string, no validators
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), // Rule 3
  metadata: z.record(z.string(), z.any()), // Rule 4
  tags: z.array(TagSchema),
});

export type FormResponse = z.infer<typeof FormSchema>;

// Create Form Schema (request.ts)
export const CreateFormSchema = z.object({
  name: z.string(),
  description: z.string(),
  is_template: z.boolean(),
  tags: z.array(z.string()),
});

export type CreateFormRequest = z.infer<typeof CreateFormSchema>;
```

## 5. Transform Rules

Transform functions bridge the gap between backend types (from API responses/requests) and frontend types (internal application types). They are organized in `transform.ts` files alongside their corresponding schemas.

### Transform Function Naming

- **Transform (Response → Frontend)**: Prefix with `t` followed by the response type name without the `Response` suffix.
  - Example: `tTag()` transforms `TagResponse` to `Tag`
  - Example: `tForm()` transforms `FormResponse` to `FormDefinition`
  - Example: `tUser()` transforms `UserResponse` to `User`

- **Parser (Frontend → Request)**: Prefix with `parse` followed by the request type name without the `Request` suffix.
  - Example: `parseCreateForm()` transforms frontend `FormDefinition` to `CreateFormRequest`
  - Example: `parseUpdateUser()` transforms frontend `User` to `UpdateUserRequest`

### Transform Function Signature

```typescript
// Transform function (Response → Frontend Type)
export function tTag(tag: TagResponse): Tag {
  return {
    id: tag.id.toString(),
    name: tag.name,
    description: tag.description,
    color: tag.color,
    abbrev: tag.name,
    createdAt: tag.created_at ?? "",
    createdBy: tag.created_by ? tag.created_by.toString() : "",
  };
}

// Parser function (Frontend Type → Request)
export function parseCreateForm(data: FormDefinition): CreateFormRequest {
  return {
    name: data.name,
    description: data.description,
    is_template: data.isTemplate,
    tags: data.tags.map((t) => t.id),
  };
}

## 6. Paginated Responses & Filtered Lists

When validating list endpoints that support filters/sorters (e.g., `/applications/available`), keep the following in mind:

- The **response schema** should describe the paginated payload. For example, `applicationFormListSchema` validates `{ items, total, page, limit, totalPages }` and each item shape.
- Transform functions (`tApplicationFormList`) should coerce backend naming (snake_case) into our frontend conventions and cast numeric identifiers to strings when necessary.
- Even though the request layer serializes filters via `qs.stringify`, the **response** must still be validated. This guarantees that adding new query parameters does not bypass runtime safety.

```ts
export const applicationFormListSchema = z.object({
  items: z.array(bindingSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number(),
});

export const tApplicationFormList = (payload: ApplicationFormListResponse) => ({
  items: payload.items.map(tApplicationForm),
  total: payload.total,
  page: payload.page,
  limit: payload.limit,
  totalPages: payload.total_pages,
});
```

With this structure in place, expanding filters (e.g., `formTagIds`, `workflowTagIds`) only requires updates in the hook/service layers—the Zod validation already ensures the response remains trustworthy.
```

### Key Rules

1.  **Response transforms** take a type from `response.ts` (e.g., `TagResponse`, `UserResponse`) and return a corresponding frontend type from `types/` (e.g., `Tag`, `User`).

2.  **Request parsers** take a frontend type and return a type from `request.ts` (e.g., `CreateFormRequest`, `UpdateUserRequest`).

3.  **Do not create new types in `src/types/`**: When defining transform functions, always aim to use existing domain types in `src/types/`. If an appropriate existing type does not fully align with the transformed data, reconsider the transformation or simplify it to fit an existing type, rather than introducing a new domain type.

4.  **Nested transforms**: When transforming nested objects, call the appropriate transform function recursively.

5.  **Array transforms**: Use `.map()` with the appropriate transform function.

6.  **Utility transforms**: For status enums and other utility transformations, use descriptive names with the `t` prefix or `parse` prefix as appropriate.

### Example Usage in Services

```typescript
// In a service file
import { tForm, tFormList } from "@/schemas/form/transform";
import { FormResponse, FormListResponse } from "@/schemas/form/response";

export async function getForm(id: string): Promise<FormDefinition> {
  const response = await api.get<FormResponse>(`/forms/${id}`);
  return tForm(response);
}

export async function listForms(): Promise<FormDefinition[]> {
  const response = await api.get<FormListResponse>("/forms");
  return tFormList(response);
}

export async function createForm(form: FormDefinition): Promise<void> {
  const payload = parseCreateForm(form);
  await api.post("/forms", payload);
}
```
