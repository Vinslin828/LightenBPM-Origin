# Objective
Review and refine the Master Data implementation to ensure it's robust against type mismatches (especially string-to-number) and adheres to linting rules without introducing new bugs.

# Key Files & Context
- `src/master-data/master-data-record.service.ts`: User applied `parseFieldValue` but introduced a bug in `createRecord`'s `values` mapping.
- `src/master-data/utils.ts`: User updated `parseFieldValue` with explicit types.

# Code Analysis & Review
The current implementation of `MasterDataUtils.parseFieldValue` is a good start, but there's a critical bug in `master-data-record.service.ts`:

1.  **Bug in `createRecord` (Single Insert):**
    ```typescript
    const values = dataKeys.map(
      (key) =>
        MasterDataUtils.parseFieldValue(
          record[key],
          fieldTypeMap.get(key) ?? FieldType.TEXT,
        ) ?? FieldType.TEXT, // <--- CRITICAL BUG: Falls back to the string "TEXT" if null
    );
    ```
    If a `NUMBER` field is provided as an empty string (or not provided but required), `parseFieldValue` returns `null`. The fallback `?? FieldType.TEXT` will then insert the string `"TEXT"` into the Postgres `DECIMAL` column, causing a 500 error. Database `null` is the correct value for missing/empty inputs.

2.  **Redundancy in `fieldTypeMap.get(key) ?? FieldType.TEXT`:**
    Since `dataKeys` are validated against `allowedFields` just before, `fieldTypeMap.get(key)` is guaranteed to exist. Using `as FieldType` is cleaner than falling back to `FieldType.TEXT` for the type parameter.

3.  **Correctness in `parseFieldValue`:**
    The final `return value as string;` is technically a type cast, not a conversion. If `value` is a number from a JSON payload, it remains a number at runtime. For consistency with the `TEXT` type, `String(value)` would be safer, although Postgres handles number-to-text well.

# Implementation Steps

1.  **Fix `createRecord` in `src/master-data/master-data-record.service.ts`:**
    Remove the `?? FieldType.TEXT` fallback from the value mapping in both single and bulk insert logic. Ensure `fieldTypeMap.get(key)` is cast to `FieldType` directly since it's validated.

2.  **Refine `parseFieldValue` in `src/master-data/utils.ts`:**
    Update the final return to use `String(value)` for `FieldType.TEXT` and ensure `null` is correctly handled without being swallowed by fallbacks in the service layer.

# Verification & Testing
- Run `make test-local-e2e` targeting `test_master_data.py`.
- Specifically, test creating a record with an empty optional `NUMBER` field to verify it correctly inserts `NULL` instead of `"TEXT"`.
- Run `make lint` to ensure no new violations are introduced.