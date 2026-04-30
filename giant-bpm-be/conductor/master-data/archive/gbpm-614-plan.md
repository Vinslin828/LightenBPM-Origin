# Objective
Fix the 500 internal server error in the Master Data PATCH records API that occurs when filtering or updating datasets containing `NUMBER` columns.

# Root Cause
The `master-data.controller.ts` receives the `filter` parameters from the query string (`@Query() filter`), meaning all values are inherently `string` types. In `master-data-record.service.ts`'s `updateRecords` method, these string values are directly pushed into the `values` array for the Prisma `$queryRawUnsafe` call. When the Postgres driver binds a `string` parameter to a `DECIMAL/NUMBER` column in a `WHERE` or `SET` clause, it results in a type mismatch error, throwing a 500 Internal Server Error.

# Code Analysis
In `master-data-schema.service.ts` (inside `importData`), explicit type conversion (`fieldTypeMap.get(key)`) already handles `NUMBER`, `BOOLEAN`, and `DATE`. This exact type conversion logic is missing in `master-data-record.service.ts` for API operations (`findRecords`, `updateRecords`, `deleteRecords`, `createRecord`) that accept dynamic input.

# Proposed Solution

1. **Add `parseFieldValue` Helper:**
   Add a utility method inside `src/master-data/utils.ts` (or `master-data-record.service.ts`) to map incoming values to their proper types based on the `FieldType`:
   ```typescript
   static parseFieldValue(value: unknown, type: string): any {
     if (value === null || value === undefined || value === '') return null; // Convert empty strings to null for DB
     if (type === 'NUMBER') {
       const parsed = Number(value);
       return isNaN(parsed) ? null : parsed;
     }
     if (type === 'BOOLEAN') {
       if (typeof value === 'string') return value.toLowerCase() === 'true';
       return Boolean(value);
     }
     if (type === 'DATE') return new Date(value as string);
     return value;
   }
   ```

2. **Apply Type Coercion in `master-data-record.service.ts`:**
   Extract a `fieldTypeMap = new Map(fields.map(f => [f.name, f.type]))` from `definition.fields`.
   - **`updateRecords`:** Call `parseFieldValue(data[key], fieldTypeMap.get(key))` for `data` and `parseFieldValue(filter[key], fieldTypeMap.get(key))` for `filter`.
   - **`findRecords`:** Apply `parseFieldValue` for `filter` values.
   - **`deleteRecords`:** Apply `parseFieldValue` for `filter` values.
   - **`createRecord`:** Apply `parseFieldValue` when mapping `values` array.

3. **Update E2E Test:**
   In `e2e_tester/tests/test_master_data.py`, expand the Update Records test to verify patching while filtering by a number column (e.g., `params={"score": 95}`).

# Verification
Run `make test-local-e2e` targeting the `test_master_data.py` test cases to ensure creating, reading, updating, and deleting work flawlessly when number fields are involved in both the payload and the query parameters.