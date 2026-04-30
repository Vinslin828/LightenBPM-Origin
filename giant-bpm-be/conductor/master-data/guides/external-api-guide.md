# GBPM-541: Master Data External API Support

**Date:** 2026-03-30
**Status:** Implemented (commits `e7b410e`, `e1e268b`)
**Target audience:** Frontend team, QA team

---

## Overview

The master data module now supports **external API-backed datasets** in addition to traditional database-stored datasets. An external API dataset fetches records from a remote HTTP endpoint at query time, maps the JSON response to defined fields, and serves results through the same records API — making it transparent to consumers.

External API datasets are **read-only**: create/update/delete record operations and export/import are forbidden.

---

## Key Concepts

### Source Type

Every dataset now has a `source_type` field:

| Value | Description |
|---|---|
| `DATABASE` (default) | Records stored in a physical PostgreSQL table. Existing behavior unchanged. |
| `EXTERNAL_API` | Records fetched live from an external HTTP endpoint. No physical table created. |

### API Config

Defines how to call the external API:

```json
{
  "url": "https://api.example.com/vendors",
  "method": "GET",
  "headers": { "Authorization": "Bearer xxx" },
  "body": "{\"key\": \"value\"}"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Full URL of the external API endpoint |
| `method` | string | Yes | HTTP method: `GET`, `POST`, or `PUT` |
| `headers` | object | No | Key-value pairs for request headers |
| `body` | string | No | Request body (for POST/PUT) |

### Field Mappings

Defines how to extract and map records from the API response:

```json
{
  "records_path": "data.items",
  "mappings": [
    { "field_name": "vendor_name", "json_path": "name" },
    { "field_name": "vendor_code", "json_path": "meta.code" }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `records_path` | string | Dot-notation path to the array of records in the API response. Use empty string `""` if the response itself is an array. |
| `mappings[].field_name` | string | Target field name in the dataset (must match a field in `fields`). Pattern: `^[a-z][a-z0-9_]*$` |
| `mappings[].json_path` | string | Dot-notation path to extract the value from each source record (e.g., `userId`, `meta.code`) |

**Type coercion** is applied based on the field type: `NUMBER` → `Number()`, `BOOLEAN` → `Boolean()`, `DATE` → ISO string, `TEXT` → `String()`.

---

## API Endpoints

Base path: `/bpm/master-data`

### New Endpoints

#### 1. Test External API

**`POST /bpm/master-data/external-api/test`**

Fires a test request to the given external API and returns the raw JSON response. Use this to inspect the response structure before configuring field mappings.

**Auth:** Admin only

**Request body:**
```json
{
  "api_config": {
    "url": "https://jsonplaceholder.typicode.com/posts",
    "method": "GET"
  }
}
```

**Response (201):** Raw JSON response from the external API.

---

#### 2. Update External API Config

**`PATCH /bpm/master-data/:code/external-config`**

Update the `api_config` and/or `field_mappings` for an existing external API dataset. Only applicable to datasets with `source_type: "EXTERNAL_API"`.

**Auth:** Admin only

**Request body** (all fields optional):
```json
{
  "api_config": {
    "url": "https://api.example.com/vendors",
    "method": "GET",
    "headers": { "Accept": "application/json" }
  },
  "field_mappings": {
    "records_path": "data",
    "mappings": [
      { "field_name": "vendor_name", "json_path": "name" }
    ]
  }
}
```

**Response (200):** Updated dataset definition (same shape as create response).

**Error (400):** If the dataset is not an `EXTERNAL_API` dataset:
```json
{ "message": "Dataset \"CODE\" is not an external API dataset." }
```

---

### Modified Endpoints

#### 3. Create Dataset

**`POST /bpm/master-data`**

**Auth:** Admin only (newly enforced — was previously unauthenticated)

Now accepts optional `source_type`, `api_config`, and `field_mappings` fields.

**Request body for external API dataset:**
```json
{
  "code": "VENDOR_LIST",
  "name": "External Vendors",
  "source_type": "EXTERNAL_API",
  "fields": [
    { "name": "vendor_code", "type": "TEXT", "required": true },
    { "name": "vendor_name", "type": "TEXT", "required": true },
    { "name": "amount", "type": "NUMBER", "required": false }
  ],
  "api_config": {
    "url": "https://api.example.com/vendors",
    "method": "GET"
  },
  "field_mappings": {
    "records_path": "data.vendors",
    "mappings": [
      { "field_name": "vendor_code", "json_path": "code" },
      { "field_name": "vendor_name", "json_path": "name" },
      { "field_name": "amount", "json_path": "financials.total" }
    ]
  }
}
```

**Validation rules:**
- `api_config` and `field_mappings` are **required** when `source_type` is `EXTERNAL_API`
- `api_config` and `field_mappings` are **ignored** when `source_type` is `DATABASE` (or omitted)

**Response (201):** Dataset definition including `source_type`, `api_config`, and `field_mappings`.

---

#### 4. Get Dataset / List Datasets

**`GET /bpm/master-data/:code`** and **`GET /bpm/master-data`**

Response now includes three additional fields:

```json
{
  "code": "VENDOR_LIST",
  "name": "External Vendors",
  "fields": [...],
  "source_type": "EXTERNAL_API",
  "api_config": { "url": "...", "method": "GET" },
  "field_mappings": { "records_path": "...", "mappings": [...] },
  "created_by": "ADMIN1",
  ...
}
```

- `source_type` is always present (`"DATABASE"` or `"EXTERNAL_API"`)
- `api_config` and `field_mappings` are `null` for `DATABASE` datasets

---

#### 5. Query Records

**`GET /bpm/master-data/:code/records`**

For `EXTERNAL_API` datasets, records are fetched live from the external API, mapped through `field_mappings`, and returned with **in-memory** filtering, sorting, pagination, and field selection.

Supported query parameters (same as database datasets):

| Parameter | Description | Example |
|---|---|---|
| `_page` | Page number (default: 1) | `_page=2` |
| `_limit` | Items per page (default: 20) | `_limit=10` |
| `_sort` | Sort field | `_sort=vendor_name` |
| `_order` | Sort direction: `asc` or `desc` | `_order=asc` |
| `_select` | Comma-separated field names to return | `_select=vendor_code,vendor_name` |
| `<field>=<value>` | Exact-match filter on any field | `user_id=1` |

**Response format** is identical to database datasets:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

#### 6. Delete Dataset

**`DELETE /bpm/master-data/:code`**

**Auth:** Admin only (newly enforced)

For `EXTERNAL_API` datasets, only the metadata row is deleted (no physical table to drop).

---

### Forbidden Operations on External API Datasets

The following operations return **403 Forbidden** for external API datasets:

| Operation | Endpoint | Error Message |
|---|---|---|
| Create record | `POST /:code/records` | `External API dataset "CODE" is read-only.` |
| Update records | `PATCH /:code/records` | `External API dataset "CODE" is read-only.` |
| Delete records | `DELETE /:code/records` | `External API dataset "CODE" is read-only.` |

The following returns **400 Bad Request**:

| Operation | Endpoint | Error Message |
|---|---|---|
| Export | `GET /:code/export` | `External API dataset "CODE" cannot be exported.` |
| Import | `POST /import` | `External API datasets cannot be imported.` |

---

## Admin Guard (Breaking Change)

The following endpoints now require **admin role** (`bpmRole: "admin"`). Non-admin users receive **403 Forbidden**:

- `POST /bpm/master-data` (create dataset)
- `DELETE /bpm/master-data/:code` (delete dataset)
- `POST /bpm/master-data/external-api/test` (test external API)
- `PATCH /bpm/master-data/:code/external-config` (update external config)
- `POST /bpm/master-data/import` (import dataset)
- `POST /bpm/master-data/:code/records` (create record)
- `PATCH /bpm/master-data/:code/records` (update records)
- `DELETE /bpm/master-data/:code/records` (delete records)

**Read operations remain accessible to all authenticated users:**
- `GET /bpm/master-data` (list datasets)
- `GET /bpm/master-data/:code` (get dataset)
- `GET /bpm/master-data/:code/records` (query records)
- `GET /bpm/master-data/:code/export` (export — but blocked for external API)

---

## Database Schema Changes

Migration: `20260330000000_add_external_api_dataset_support`

Three columns added to `dataset_definitions`:

| Column | Type | Default | Description |
|---|---|---|---|
| `source_type` | `TEXT NOT NULL` | `'DATABASE'` | `DATABASE` or `EXTERNAL_API` |
| `api_config` | `JSONB` | `NULL` | API configuration for external datasets |
| `field_mappings` | `JSONB` | `NULL` | Field mapping rules for external datasets |

**Backward compatible:** Existing datasets automatically have `source_type = 'DATABASE'` with null config fields.

---

## Integration Workflow (Frontend)

### Creating an External API Dataset

1. **Test the API** — Call `POST /external-api/test` with the target URL/method. Display the raw JSON response to the user so they can see the structure.

2. **Configure field mappings** — Based on the response structure, let the user define:
   - `records_path`: where the array of records lives (e.g., `data.items` or `""` for root array)
   - `mappings`: which JSON paths map to which dataset fields

3. **Create the dataset** — Call `POST /master-data` with `source_type: "EXTERNAL_API"`, the field definitions, `api_config`, and `field_mappings`.

4. **Query records** — Use the standard `GET /:code/records` endpoint. The API handles fetching, mapping, filtering, and pagination transparently.

### Editing an External API Dataset

- Use `PATCH /:code/external-config` to update `api_config` and/or `field_mappings` without recreating the dataset.

### UI Considerations

- Show `source_type` badge on dataset list (e.g., "Database" vs "External API")
- Hide create/update/delete record buttons for external API datasets
- Hide export button for external API datasets
- Show API config and field mappings in dataset detail view
- Provide a "Test API" button that calls the test endpoint and shows raw response

---

## QA Test Scenarios

### Happy Path

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Test external API | POST `/external-api/test` with valid URL | 201, raw JSON response returned |
| 2 | Create external API dataset | POST with `source_type: "EXTERNAL_API"`, valid config & mappings | 201, definition includes `source_type`, `api_config`, `field_mappings` |
| 3 | List datasets shows source_type | GET `/master-data` | External API dataset shows `source_type: "EXTERNAL_API"` |
| 4 | Query records from external API | GET `/:code/records` | Records fetched from API, mapped to defined fields, paginated |
| 5 | Pagination works | GET `/:code/records?_page=2&_limit=10` | Correct page/total/totalPages |
| 6 | Filter works | GET `/:code/records?user_id=1` | Only matching records returned |
| 7 | Field selection works | GET `/:code/records?_select=field1,field2` | Only selected fields in response |
| 8 | Update external config | PATCH `/:code/external-config` with new api_config | 200, updated config in response |
| 9 | Delete external API dataset | DELETE `/:code` | 200, dataset removed |

### Error / Guard Cases

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 10 | Create record on external API dataset | POST `/:code/records` | 403, "read-only" |
| 11 | Update records on external API dataset | PATCH `/:code/records` | 403, "read-only" |
| 12 | Delete records on external API dataset | DELETE `/:code/records` | 403, "read-only" |
| 13 | Export external API dataset | GET `/:code/export` | 400, "cannot be exported" |
| 14 | Import external API dataset | POST `/import` with `source_type: "EXTERNAL_API"` | 400, "cannot be imported" |
| 15 | Update external config on DATABASE dataset | PATCH `/:code/external-config` | 400, "not an external API dataset" |
| 16 | Non-admin creates dataset | POST `/master-data` as non-admin | 403 |
| 17 | Non-admin tests external API | POST `/external-api/test` as non-admin | 403 |
| 18 | Non-admin deletes dataset | DELETE `/:code` as non-admin | 403 |
| 19 | Non-admin creates/updates/deletes records | POST/PATCH/DELETE `/:code/records` as non-admin | 403 |
| 20 | Test API with invalid URL | POST `/external-api/test` with bad URL | Error response |
| 21 | Create external API dataset without api_config | POST with `source_type: "EXTERNAL_API"` but no `api_config` | 400 validation error |

### Backward Compatibility

| # | Scenario | Expected |
|---|---|---|
| 22 | Existing DATABASE datasets | `source_type` defaults to `"DATABASE"`, all existing operations work unchanged |
| 23 | Create dataset without source_type | Defaults to `DATABASE`, no api_config/field_mappings needed |
