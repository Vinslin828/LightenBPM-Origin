# GBPM-717 — Configurable Workflow Serial Number Prefix
## Integration Guideline for QA & Frontend

**Date:** 2026-04-14
**Ticket:** GBPM-717
**Status:** Implemented, pending migration on target environment

---

## Overview

This feature allows administrators to configure a custom serial number prefix per workflow. All applications submitted through that workflow will use the new format.

| | Before | After |
|---|---|---|
| Format | `APP-1707829876543` | `APP-202601010001` |
| Prefix | Hard-coded `APP` | Configurable per workflow (admin only) |
| Suffix | Unix timestamp (ms) | `YYYYMMDD` + 4-digit daily counter |

**Example serial numbers:**
- `APP-202601010001` — first app of the day, default prefix
- `HR-202601010001` — first app of the day, HR workflow
- `IT-202601010042` — 42nd app on that date, IT workflow

---

## API Changes

### 1. Get Workflow — new field in response

**`GET /bpm/workflow/:workflow_id`**

The response `WorkflowDto` now includes `serial_prefix`:

```json
{
  "id": "abc123",
  "is_active": true,
  "serial_prefix": "APP",
  "revision": { ... },
  "tags": [],
  "bindingForm": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `serial_prefix` | `string` | Current prefix for this workflow. Always present. Default: `"APP"` |

### 2. Update Workflow — new optional field

**`PUT /bpm/workflow/:workflow_id`** *(admin only)*

Add `serial_prefix` to the request body to update the prefix. All other fields (`tags`, `is_active`) remain optional and independent.

**Request body:**
```json
{
  "serial_prefix": "HR"
}
```

**Validation rules for `serial_prefix`:**

| Rule | Detail |
|---|---|
| Optional | Can be omitted; other fields update independently |
| Uppercase only | Must match `[A-Z0-9]+` — no lowercase, no special characters |
| Max 3 characters | `HR`, `IT`, `APP`, `TPE` — up to 3 chars |
| Min 1 character | Empty string is rejected |

**Valid examples:** `APP`, `HR`, `IT`, `TP`, `T1`

**Invalid examples (all return 400):**

| Value | Reason |
|---|---|
| `"hr"` | Lowercase letters |
| `"ABCD"` | Exceeds 3 characters |
| `"HR-"` | Contains special character |
| `""` | Empty string |
| `"h r"` | Contains space |

**Success response (200):** Full `WorkflowDto` with updated `serial_prefix`.

**Error response (400):**
```json
{
  "statusCode": 400,
  "message": ["serial_prefix must be uppercase alphanumeric"],
  "error": "Bad Request"
}
```

**Error response (403):** Non-admin users receive `Forbidden`.

---

## Application Serial Number Format

Once a workflow has a prefix set, all new applications submitted through that workflow will use:

```
{PREFIX}-{YYYYMMDD}{XXXX}
```

| Segment | Example | Description |
|---|---|---|
| `PREFIX` | `HR` | Workflow's `serial_prefix` value |
| `-` | `-` | Literal separator |
| `YYYYMMDD` | `20260101` | Submission date (server timezone) |
| `XXXX` | `0001` | Daily counter, zero-padded to 4 digits, starts at `0001` each day |

**Full example:** `HR-202601010001`

**Notes:**
- The counter resets to `0001` every calendar day.
- Counter is per-prefix — all workflows sharing the same prefix share a single daily counter.
- **Existing applications** submitted before this feature was deployed keep their old `APP-{timestamp}` format. This is intentional and permanent.
- The total serial number length is always **fixed**: 3 (prefix) + 1 (dash) + 8 (date) + 4 (counter) = **16 characters** for a 3-char prefix, **15** for 2-char, **14** for 1-char.

---

## Frontend Integration Notes

### Displaying `serial_prefix` in Workflow Settings

- Read `serial_prefix` from `GET /workflow/:id` response.
- Show it in the workflow configuration/settings screen (admin view).
- Default value for all existing workflows is `"APP"`.

### Editing the Prefix

- The prefix field should be an input in the workflow settings form (admin only).
- Apply these client-side validations before submission:
  - Uppercase transform: auto-convert to uppercase on input, or show an error for lowercase
  - Length limit: max 3 characters
  - Character set: only letters A-Z and digits 0-9
- Send via `PUT /workflow/:workflow_id` with `{ "serial_prefix": "HR" }`.
- Show the updated `serial_prefix` from the `200` response.

**Suggested input field spec:**
```
Label:       Serial Number Prefix
Input type:  text
Max length:  3
Pattern:     [A-Z0-9]{1,3}
Transform:   auto-uppercase on change
Help text:   "Up to 3 uppercase letters or digits. Applications will be numbered {PREFIX}-YYYYMMDD0001."
```

### Displaying Serial Numbers

The new serial number format is human-readable. The FE may want to:
- Display it as-is: `HR-202601010001`
- Support partial search (the backend's `serialNumber` filter supports substring matching)
- Note that old-format serials (`APP-1707829876543`) may still appear for pre-existing applications

---

## QA Test Scenarios

### Scenario 1 — Default prefix on new workflow

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create a new workflow | `serial_prefix` in response = `"APP"` |
| 2 | Submit an application | `serial_number` format = `APP-YYYYMMDD0001` |
| 3 | Verify regex | Matches `^APP-\d{12}$` |

### Scenario 2 — Set custom prefix (happy path)

| Step | Action | Expected Result |
|---|---|---|
| 1 | `PUT /workflow/:id` with `{"serial_prefix": "HR"}` | 200, response has `serial_prefix: "HR"` |
| 2 | `GET /workflow/:id` | `serial_prefix` = `"HR"` (persisted) |
| 3 | Submit an application | `serial_number` starts with `HR-` |
| 4 | Verify full format | Matches `^HR-\d{12}$` |

### Scenario 3 — Daily counter

| Step | Action | Expected Result |
|---|---|---|
| 1 | Submit application #1 on a given day | `serial_number` ends with `0001` |
| 2 | Submit application #2 on the same day | `serial_number` ends with `0002` |
| 3 | Submit on the next calendar day | Counter resets — ends with `0001` again |

### Scenario 4 — Prefix validation (negative cases)

| Input | Expected HTTP Status |
|---|---|
| `{"serial_prefix": "hr"}` | `400 Bad Request` |
| `{"serial_prefix": "ABCD"}` | `400 Bad Request` |
| `{"serial_prefix": ""}` | `400 Bad Request` |
| `{"serial_prefix": "A-1"}` | `400 Bad Request` |
| `{"serial_prefix": "HR"}` | `200 OK` |
| `{"serial_prefix": "T1"}` | `200 OK` |
| `{"serial_prefix": "A"}` | `200 OK` |

### Scenario 5 — Permission check

| Actor | Action | Expected |
|---|---|---|
| Admin | `PUT /workflow/:id` with `serial_prefix` | `200 OK` |
| Non-admin | `PUT /workflow/:id` with `serial_prefix` | `403 Forbidden` |

### Scenario 6 — Prefix update does not affect existing applications

| Step | Action | Expected Result |
|---|---|---|
| 1 | Submit app → get `HR-202601010001` | ✓ |
| 2 | Change prefix to `IT` | `serial_prefix` = `"IT"` |
| 3 | Check the app from step 1 | `serial_number` is still `HR-202601010001` (unchanged) |
| 4 | Submit a new app | New serial uses `IT-` prefix |

### Scenario 7 — Partial serial number search

| Input (serialNumber param) | Expected |
|---|---|
| `HR-202601010001` (exact) | Returns the matching application |
| `HR-20260101` (partial) | Returns all apps from that day |
| `0001` (partial) | Returns apps ending in `0001` |

### Scenario 8 — Shared counter for same prefix

| Step | Action | Expected Result |
|---|---|---|
| 1 | Submit via Workflow A (prefix=`HR`) | `HR-202601010001` |
| 2 | Submit via Workflow B (prefix=`HR`) | `HR-202601010002` (shared counter) |
| 3 | Submit via Workflow A again | `HR-202601010003` |

---

## Environment Notes

- The migration `20260414000000_add_workflow_serial_config` adds `serial_prefix` column and counter table.
- The migration `20260416072011_fix_serial_counter_key_to_prefix` changes counter key from `(workflow_id, date)` to `(serial_prefix, date)` to fix collisions when multiple workflows share the same prefix.
- **After migration**: All existing workflows automatically have `serial_prefix = 'APP'`. No admin action required unless a custom prefix is desired.
- **Before migration is applied**: The feature is not available — any `serial_prefix` field in the API will be absent.

---

## Quick Reference

```
Endpoint:   PUT /bpm/workflow/:workflow_id
Auth:       Admin only
Body:       { "serial_prefix": "HR" }
Response:   200 WorkflowDto (includes serial_prefix)

Serial format: {PREFIX}-{YYYYMMDD}{XXXX}
Example:       HR-202601010001
Prefix rules:  [A-Z0-9], 1–3 chars, default "APP"
```
