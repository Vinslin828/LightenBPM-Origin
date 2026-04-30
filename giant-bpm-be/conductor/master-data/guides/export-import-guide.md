# Master Data Export / Import Guide

**Date:** 2026-04-27
**Status:** Implemented (commits `e157f21`, `4aa75da`)
**Target audience:** Frontend team, QA team, integration engineers

---

## Overview

The Master Data module supports two separate export/import paths, each with a distinct
responsibility:

| Path | Endpoints | What it moves |
|------|-----------|---------------|
| **Schema (JSON)** | `GET /:code/export` · `POST /import` | Dataset definition — fields, metadata, audit info |
| **Records (CSV)** | `GET /:code/records/export-csv` · `POST /:code/records/import-csv` | Row data stored in the `md_*` table |

These paths are intentionally independent. Use the JSON path to migrate or restore a dataset's
*structure*. Use the CSV path to move the *data* inside it.

---

## Schema Export/Import (JSON)

### When to use

- Copying a dataset definition from one environment to another (dev → staging → prod)
- Backing up and restoring a dataset structure including original audit fields
- Syncing schema between tenants

### Export — `GET /bpm/master-data/:code/export`

Returns the dataset definition as a JSON object. No record data is included.

**Auth:** Any authenticated user.

**Example request:**
```
GET /bpm/master-data/VENDORS/export
Authorization: Bearer <token>
```

**Example response `200`:**
```json
{
  "definition": {
    "code": "VENDORS",
    "name": "Vendors",
    "source_type": "STANDARD",
    "fields": [
      { "name": "vendor_name", "type": "TEXT", "required": true },
      { "name": "score", "type": "NUMBER", "required": false }
    ],
    "created_by": "admin_user",
    "updated_by": "admin_user",
    "created_at": "2024-01-15T08:00:00.000Z",
    "updated_at": "2024-03-10T12:30:00.000Z"
  }
}
```

**Notes:**
- `EXTERNAL_API` datasets are supported — only the schema is returned, not external records.
- There is no `records` key in the response.

**Error cases:**
- `404` — dataset not found

---

### Import — `POST /bpm/master-data/import`

Creates the dataset definition if it does not already exist. If the dataset already exists, this
is a no-op — the existing definition is returned unchanged.

**Auth:** Admin users only.

**Request body:**
```json
{
  "definition": {
    "code": "VENDORS",
    "name": "Vendors",
    "fields": [
      { "name": "vendor_name", "type": "TEXT", "required": true },
      { "name": "score", "type": "NUMBER", "required": false }
    ]
  }
}
```

**Success response `201`:**
```json
{
  "success": true,
  "definition": {
    "code": "VENDORS",
    "name": "Vendors",
    ...
  }
}
```

**Audit field preservation:**

Include `created_by`, `updated_by`, or `created_at` inside the `definition` object to preserve
the original authorship when restoring to a fresh environment:

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

These values are written only when the dataset is being created for the first time. On a no-op
(dataset already exists) they are ignored.

**Idempotency:**

Calling import for an existing dataset returns `201` with the current definition and does not
modify anything. This makes it safe to run repeatedly in deployment pipelines.

**Error cases:**
- `400` — dataset has `source_type: EXTERNAL_API` (EXTERNAL_API schemas cannot be imported)
- `403` — caller is not an admin user

---

### Deprecation — `records` field in import payload

Earlier versions of the import API accepted a `records` array alongside the definition. That
field is now ignored. If your payload still includes it:

- The records are silently dropped — nothing is inserted
- The response includes a `Deprecation: true` header
- A warning is logged server-side

Migrate by removing the `records` field from the payload and using the CSV import endpoint for
data instead.

---

## Record Export/Import (CSV)

### When to use

- Seeding a new environment with reference data
- Bulk-editing records (export → modify locally → re-import)
- Providing a data snapshot for reporting or auditing
- Data feed from an external source into a `STANDARD` dataset

### Export — `GET /bpm/master-data/:code/records/export-csv`

Downloads all records from the dataset as an RFC 4180 CSV file.

**Auth:** Any authenticated user.

**Example request:**
```
GET /bpm/master-data/VENDORS/records/export-csv
Authorization: Bearer <token>
```

**Response headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="VENDORS.csv"
```

**Example response body:**
```
vendor_name,score
Vendor A,95
"Vendor, B",80
```

**CSV format rules:**
- First row contains field names in schema definition order
- Records ordered by `id ASC`
- Values containing commas, double-quotes, or newlines are quoted per RFC 4180
- Null/empty values appear as empty strings

**Error cases:**
- `404` — dataset not found
- `403` — dataset is `EXTERNAL_API` type (use the external source directly)

---

### Import — `POST /bpm/master-data/:code/records/import-csv`

Uploads a CSV file and inserts all rows atomically. The entire import succeeds or fails — there
is no partial success.

**Auth:** Admin users only.

**Request:** `multipart/form-data` with a single field named `file`.

**Example (curl):**
```bash
curl -X POST \
  https://<host>/bpm/master-data/VENDORS/records/import-csv \
  -H "Authorization: Bearer <token>" \
  -F "file=@vendors.csv"
```

**Example CSV file (`vendors.csv`):**
```
vendor_name,score
"Vendor A",95
"Vendor B",80
"Vendor C",70
```

**Success response `201`:**
```json
{ "inserted": 3 }
```

**Behaviour:**
- The `id` column is ignored if present in the CSV — IDs are always auto-assigned by the database
- Column names must exactly match field names in the dataset schema
- All rows are inserted in a **single database transaction**
- Any row that violates a constraint (unique, required, type) rolls back the **entire** import
- The database error message is returned in the `400` response body to help diagnose the problem

**Error cases:**
- `400` — no file uploaded
- `400` — a CSV column is not defined in the dataset schema
- `400` — database constraint violation (message included, full rollback)
- `403` — dataset is `EXTERNAL_API` or a system dataset (`USERS`, `ORG_UNITS`)
- `403` — caller is not an admin user

---

## Common Workflows

### Migrate a dataset between environments

```
1. GET  /bpm/master-data/VENDORS/export          → save response as vendors-schema.json
2. POST /bpm/master-data/VENDORS/records/export-csv → save response as vendors-data.csv

On target environment:
3. POST /bpm/master-data/import          body=vendors-schema.json  → creates definition
4. POST /bpm/master-data/VENDORS/records/import-csv  file=vendors-data.csv  → inserts records
```

### Bulk-edit records

```
1. GET  /bpm/master-data/VENDORS/records/export-csv → open in spreadsheet, edit values
2. Delete existing records via DELETE /bpm/master-data/VENDORS/records?<filter>
3. POST /bpm/master-data/VENDORS/records/import-csv  file=edited.csv → re-insert
```

### Seed a fresh environment from backup

```
1. POST /bpm/master-data/import
   body: { "definition": { ...schema, "created_by": "original_author", "created_at": "..." } }
   → dataset created with preserved audit fields

2. POST /bpm/master-data/VENDORS/records/import-csv
   file: original backup CSV
   → all records restored atomically
```

---

## Constraints and Limitations

| Constraint | Detail |
|-----------|--------|
| CSV import is append-only | Re-importing the same CSV creates duplicate rows. Delete existing records first if you want a clean reload. |
| `updated_at` on schema import | Always reflects the import time. Only `created_by`, `updated_by`, and `created_at` can be overridden. |
| CSV import memory | The full CSV is loaded into memory. Very large files (tens of thousands of rows) may approach limits. |
| No pre-validation | CSV import does not validate values before sending to the database. Errors are surfaced from PostgreSQL directly. |
| EXTERNAL_API | Schema can be exported but not imported. Record CSV export/import is fully blocked. |
| System datasets | `USERS` and `ORG_UNITS` cannot receive CSV imports — they are read-only views of core tables. |
