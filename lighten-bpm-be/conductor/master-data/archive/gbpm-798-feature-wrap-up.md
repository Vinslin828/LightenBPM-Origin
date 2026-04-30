# GBPM-798: Master Data CSV Export/Import — Feature Wrap-Up

## Summary

GBPM-798 introduced record-level CSV export and import for Master Data tables, then a follow-up
split the JSON schema export/import API into a separate concern. The two paths now have distinct,
non-overlapping responsibilities.

---

## What Was Delivered

### Phase 1 — CSV Record Operations (original GBPM-798)

New endpoints for moving **row data** in and out of `md_*` tables:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/master-data/:code/records/export-csv` | GET | Download all records as an RFC 4180 CSV file |
| `/master-data/:code/records/import-csv` | POST | Atomic bulk insert from an uploaded CSV file |

Key behaviours:
- **Export** queries the `md_*` table ordered by `id`, serialises values using RFC 4180 rules
  (quoting, escaping), and streams the result as a `text/csv` attachment.
- **Import** parses the CSV, validates that every column exists in the dataset schema, then
  inserts all rows in a **single database transaction**. Any constraint violation rolls back the
  entire batch — no partial success.
- Database error messages are surfaced directly to the caller as `400 Bad Request`.
- Import requires admin privilege (`isAdminUser`). Export is available to all authenticated users.
- Both endpoints are **blocked for `EXTERNAL_API` datasets** (the data lives externally; the
  `md_*` table does not hold records for those datasets).
- System datasets (`USERS`, `ORG_UNITS`) are **blocked from import** (read-only views of core
  tables).

### Phase 2 — Schema/Definition Split (follow-up)

The original JSON `export`/`import` endpoints bundled both schema and records in one payload.
This created two overlapping record-insert paths with different semantics (per-row partial commit
vs. atomic batch). The follow-up removed the overlap:

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /master-data/:code/export` | Returned `{ definition, records[] }` | Returns `{ definition }` only |
| `POST /master-data/import` | Created definition + inserted records | Creates definition only (schema-only) |

Additional changes in Phase 2:

- **`EXTERNAL_API` export unblocked** — exporting the *definition* of an EXTERNAL_API dataset
  is safe (there are no records to leak). The import side remains blocked.
- **Deprecation header** — if a caller still sends `records` in the import payload, the server
  drops the field silently and returns `Deprecation: true` in the response header. A `warn`-level
  log line is emitted with the dataset code and row count.
- **Audit field preservation** — `created_by`, `updated_by`, and `created_at` can be included in
  the `definition` object of the import payload. If the dataset is being created for the first
  time, those values are written to the database. This makes JSON import a true backup/restore
  tool for schema metadata.
- **Idempotent import** — if the dataset already exists, import is a no-op (returns the existing
  definition without error).

---

## API Reference

### `GET /master-data/:code/records/export-csv`

Returns a CSV file attachment.

**Response headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="<code>.csv"
```

**CSV format:**
- First row: field names as headers (order matches dataset schema definition order)
- Subsequent rows: one row per record, ordered by `id ASC`
- Values quoted per RFC 4180 if they contain commas, double-quotes, or newlines
- Empty/null values serialised as empty strings

**Error cases:**
- `404` — dataset not found
- `403` — dataset is `EXTERNAL_API` type

---

### `POST /master-data/:code/records/import-csv`

Multipart upload. Admin only.

**Request:**
```
Content-Type: multipart/form-data
Field: file  (binary, text/csv)
```

**Success response `201`:**
```json
{ "inserted": 42 }
```

**Behaviour:**
- `id` column in the CSV is ignored (auto-increment, server-assigned)
- All other columns must match field names in the dataset schema exactly
- All rows inserted in a single transaction — any failure rolls back everything
- Database error message returned verbatim in the `400` response body

**Error cases:**
- `400` — no file uploaded
- `400` — CSV column not defined in dataset schema
- `400` — database constraint violation (error message included)
- `403` — dataset is `EXTERNAL_API` or a system dataset
- `403` — caller is not an admin user

---

### `GET /master-data/:code/export` *(schema only)*

Returns the dataset definition as JSON. No record data included.

**Success response `200`:**
```json
{
  "definition": {
    "code": "VENDORS",
    "name": "Vendors",
    "source_type": "STANDARD",
    "fields": [...],
    "created_by": "admin_user",
    "created_at": "2024-01-15T08:00:00.000Z",
    ...
  }
}
```

**Notes:**
- `EXTERNAL_API` datasets are now supported (schema export is safe)
- No `records` key in the response

---

### `POST /master-data/import` *(schema only)*

Creates a dataset definition if it does not already exist. Admin only.

**Request body:**
```json
{
  "definition": {
    "code": "VENDORS",
    "name": "Vendors",
    "fields": [...],
    "created_by": "original_author",
    "created_at": "2024-01-15T08:00:00.000Z"
  }
}
```

**Optional audit fields** (`created_by`, `updated_by`, `created_at`) on the `definition` object
are written to the database only when the dataset is being created for the first time.

**Success response `201`:**
```json
{
  "success": true,
  "definition": { ... }
}
```

**Deprecation behaviour** (backward compat):
- Sending `records: [...]` in the payload → field is silently ignored
- Response includes `Deprecation: true` header
- Server logs a warn with the dataset code and dropped row count

**Error cases:**
- `400` — `EXTERNAL_API` dataset cannot be imported
- `403` — caller is not an admin user

---

## API Responsibility Matrix

| Concern | JSON (`/export`, `/import`) | CSV (`/records/export-csv`, `/records/import-csv`) |
|---------|-----------------------------|----------------------------------------------------|
| Target | `dataset_definitions` table | `md_{code}` data tables |
| Content | Schema, fields, metadata | Row values, records |
| Atomicity | DDL + metadata | Record batch |
| Validation | Schema / metadata check | Database constraint check |
| Audit fields | Preserved from payload | Database defaults (`now()`, auto-id) |
| Primary use case | Migration, backup/restore | Bulk edit, data feed, reporting |
| EXTERNAL_API export | Allowed (schema only) | Blocked |
| EXTERNAL_API import | Blocked | Blocked |
| System dataset import | N/A (schema-level) | Blocked |

---

## Files Changed

### Phase 1 — CSV record operations

| File | Change |
|------|--------|
| `src/master-data/master-data-record.service.ts` | `exportAllRecords`, `importCsvRecords` methods |
| `src/master-data/utils.ts` | `recordsToCsv`, `parseCsv`, `parseCsvRows` utilities |
| `src/master-data/master-data.controller.ts` | `exportRecordsCsv`, `importRecordsCsv` endpoints |
| `src/master-data/master-data-record.service.spec.ts` | Unit tests for CSV service methods |
| `src/master-data/utils.spec.ts` | Unit tests for CSV utilities |

### Phase 2 — Schema/definition split

| File | Change |
|------|--------|
| `src/master-data/dto/import-dataset.dto.ts` | Renamed to `ImportDefinitionDto`; added `@IsObject()` / `@IsArray()` for NestJS validation pipeline |
| `src/master-data/dto/response/dataset-export-response.dto.ts` | Removed `records` field |
| `src/master-data/dto/response/dataset-import-response.dto.ts` | Replaced `count` with `definition` |
| `src/master-data/master-data-schema.service.ts` | Stripped records loop from `importDataset`; stripped records query from `exportDataset`; added `createDatasetWithAudit` helper; removed EXTERNAL_API export guard |
| `src/master-data/master-data.controller.ts` | Added `Deprecation` header logic; updated Swagger decorators |
| `src/master-data/master-data-schema.service.spec.ts` | New tests for schema-only export/import behaviour |
| `src/master-data/master-data.controller.spec.ts` | Deprecation header assertions |

### E2E tests

| File | Change |
|------|--------|
| `e2e_tester/tests/test_master_data.py` | Fixed lifecycle test; added `test_master_data_schema_export_import` (6 scenarios) and `test_master_data_csv_export_import` (9 scenarios) |
| `e2e_tester/tests/test_master_data_external_api.py` | Fixed lifecycle test: EXTERNAL_API export now expects `200` instead of `400` |

---

## Known Constraints

- **CSV import memory** — the entire file is loaded into memory and a single parameterised SQL
  statement is built. For very large datasets (tens of thousands of rows), this may hit PostgreSQL
  parameter limits or memory pressure. Chunked import is out of scope for this ticket.
- **`updated_at` on import** — `updated_at` always reflects the import time because Prisma
  manages the `@updatedAt` column automatically. Only `created_by`, `updated_by`, and `created_at`
  can be overridden via the import payload.
- **CSV import is append-only** — there is no upsert or merge behaviour. Re-importing the same
  CSV creates duplicate rows unless records are deleted first.

---

## Commits

| Hash | Message |
|------|---------|
| `e157f21` | `[GBPM-798] feat(master-data): separate schema-only export/import from record CSV operations` |
| `4aa75da` | `test(master-data): add E2E test coverage for CSV record export/import endpoints` |
