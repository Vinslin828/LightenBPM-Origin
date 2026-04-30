# Master Data Schema Update — Frontend Integration Guide

**API base path:** `/bpm/master-data`
**Date:** 2026-04-01
**Auth:** Bearer JWT required. All endpoints on this page require the user to have `bpmRole === "admin"`.

---

## 1. Rename a Dataset

### `PATCH /bpm/master-data/:code`

Updates the display name of a dataset.

**Path parameter:** `code` — the dataset's unique identifier (e.g. `VENDORS`)

**Request body:**
```json
{
  "name": "Updated Vendor List"
}
```

**Success response `200`:** Returns the full updated dataset definition (see [Dataset Definition Object](#dataset-definition-object)).

**Error cases:**

| HTTP | When |
|---|---|
| `400 Bad Request` | `name` is missing or empty |
| `403 Forbidden` | Caller is not an admin |
| `404 Not Found` | Dataset `code` does not exist |
| `409 Conflict` | Another dataset already uses that name, or the dataset is a system dataset (`USERS`, `ORG_UNITS`) |

---

## 2. Add / Remove Columns

### `PATCH /bpm/master-data/:code/schema`

Adds new columns and/or removes existing columns from a dataset in one call. Only supported for `DATABASE` type datasets.

**Path parameter:** `code` — dataset identifier

**Request body:**
```json
{
  "add_fields": [
    {
      "name": "status",
      "type": "TEXT",
      "required": true,
      "default_value": "active"
    },
    {
      "name": "score",
      "type": "NUMBER",
      "required": false
    }
  ],
  "remove_fields": ["old_column"]
}
```

Both `add_fields` and `remove_fields` are optional, but **at least one must be provided and non-empty**.

### `add_fields` — Field Object

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Column name. Lowercase letters, digits, underscores only. Must start with a letter. |
| `type` | `"TEXT" \| "NUMBER" \| "BOOLEAN" \| "DATE"` | Yes | Data type |
| `required` | `boolean` | Yes | Whether the column is mandatory (non-nullable) |
| `default_value` | `string \| number \| boolean` | Conditional | **Required** when `required: true` and the dataset already has records. Used to fill existing rows. |

### `remove_fields`

Array of existing column names to drop. Example: `["old_column", "deprecated_field"]`

### Success response `200`

Returns the full updated dataset definition with the revised `fields` array.

### Error cases

| HTTP | When |
|---|---|
| `400 Bad Request` | Both `add_fields` and `remove_fields` are empty |
| `400 Bad Request` | A field name in `remove_fields` does not exist |
| `400 Bad Request` | Adding `"id"` or removing `"id"` |
| `400 Bad Request` | `required: true` on a new column, dataset has existing records, and no `default_value` was provided |
| `400 Bad Request` | Dataset is of type `EXTERNAL_API` — use `PATCH /:code/external-config` instead |
| `403 Forbidden` | Caller is not an admin |
| `404 Not Found` | Dataset `code` does not exist |
| `409 Conflict` | A field in `add_fields` already exists in the dataset |
| `409 Conflict` | Duplicate names within `add_fields` |
| `409 Conflict` | Dataset is a system dataset (`USERS`, `ORG_UNITS`) |

---

## 3. Dataset Definition Object

Both endpoints return this shape on success:

```jsonc
{
  "id": 12,
  "code": "VENDORS",
  "name": "Vendor List",
  "source_type": "DATABASE",           // "DATABASE" | "EXTERNAL_API"
  "fields": [
    {
      "name": "vendor_name",
      "type": "TEXT",
      "required": true
    },
    {
      "name": "score",
      "type": "NUMBER",
      "required": false
    }
  ],
  "created_by": "admin_user_code",
  "updated_by": "admin_user_code",
  "created_at": "2026-03-10T08:00:00.000Z",
  "updated_at": "2026-04-01T10:30:00.000Z"
}
```

> `table_name` is intentionally excluded from the response. Use `code` as the stable identifier for all subsequent record operations.

---

## 4. UX Notes

- **Adding a required column to a dataset that already has records** — prompt the user for a `default_value`. The API will reject the request without it.
- **Removing a column is irreversible** — the column and all its data are permanently deleted. Show a confirmation dialog before submitting.
- **Column names are immutable** — renaming a column is not supported. The workaround is to remove the old column and add a new one, which causes data loss.
- **`code` is immutable** — only `name` can be changed via `PATCH /:code`.
- **`EXTERNAL_API` datasets** do not have editable columns via this endpoint. To update their field mappings, use `PATCH /:code/external-config`.
