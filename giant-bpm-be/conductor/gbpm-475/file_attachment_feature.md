# File Attachment Feature Integration Guide

This document outlines the architecture and API specifications for the frontend team to integrate the GBPM-475 file attachment feature.

## Architectural Overview

To avoid proxying large files through the backend (preventing high memory, CPU, and bandwidth usage), we've implemented a **direct-to-S3 upload architecture** using presigned URLs.

### S3 Key Structure

Files are stored under the uploading user's namespace, not the application's serial number:

```
{user_code}/attachments/{uuid}_{sanitized_file_name}
```

This means files are owned by the user and are S3-location-independent of which application they end up on — enabling the **Draft Flow** below.

### Unified Attachment Model

There is now a single `Attachment` record that progresses through statuses:

| Status | Meaning |
|---|---|
| `PENDING` | Presign issued, file not yet uploaded to S3 |
| `UPLOADED` | Upload confirmed; file is active |

An attachment is linked to either a `serial_number` (for existing applications) or a `draft_id` (for new applications not yet submitted). After submission, draft attachments are atomically bound to the new serial number.

If an upload is presigned but never confirmed, the record remains `PENDING` and is eventually purged by admin tooling.

---

## Flow A: Upload to an Existing Application

Use this flow when the user is adding attachments to an application that already exists (i.e., you have a `serial_number`).

The upload process consists of three steps:
1. **Presign** — Request a temporary S3 upload URL from the backend.
2. **Transfer** — Upload the file directly from the browser to S3.
3. **Confirm** — Tell the backend the transfer was successful to register the attachment.

### Step 1: Request Presigned Upload URL

```http
POST /applications/{serial_number}/attachments/presign-upload
```

**Request Body:**
```json
{
  "field_key": "upload_receipt",
  "file_name": "invoice.pdf",
  "content_type": "application/pdf",
  "file_size": 204800
}
```

**Response (201 Created):**
```json
{
  "upload_url": "https://s3.amazonaws.com/bpm-attachments-dev/...",
  "s3_key": "USR001/attachments/a1b2c3d4-e5f6-7890_invoice.pdf",
  "expires_in": 300
}
```

### Step 2: Direct Upload to S3

Use the `upload_url` from Step 1 to upload the file directly to S3. **Do not send authorization headers** (like your JWT) to S3, as it will reject the request due to signature mismatch.

```http
PUT {upload_url}
Content-Type: {content_type from Step 1}
```

> S3 CORS is fully configured to accept PUT requests directly from the frontend. S3 will respond with `200 OK` upon success.

### Step 3: Confirm Upload

Once S3 returns `200 OK`, inform the backend to register the attachment.

```http
POST /applications/{serial_number}/attachments
```

**Request Body:**
```json
{
  "s3_key": "USR001/attachments/a1b2c3d4-e5f6-7890_invoice.pdf",
  "remark": "March invoice"
}
```

> **Note:** Only `s3_key` is required. File metadata (`file_name`, `content_type`, etc.) is already stored in the `PENDING` record created during Step 1, so there's no need to repeat it here.

**Response (201 Created):** Returns the fully registered Attachment object.

---

## Flow B: Draft Flow (Upload Before Submission)

Use this flow when the user needs to attach files while **filling in a new application form**, before the application is submitted and gets a `serial_number`.

The draft is a client-generated session ID that groups pre-submission attachments. On application submission, the `draft_id` is passed and all its attachments are atomically bound to the new application.

### Step 1: Initialize Draft

```http
POST /attachments/drafts/init
```

No request body needed.

**Response (201 Created):**
```json
{
  "draft_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

> Hold onto this `draft_id` — you'll use it throughout the rest of the form session.

### Step 2: Request Draft Presigned Upload URL

```http
POST /attachments/drafts/{draft_id}/presign-upload
```

**Request Body:** Same as Flow A Step 1.
```json
{
  "field_key": "upload_receipt",
  "file_name": "invoice.pdf",
  "content_type": "application/pdf",
  "file_size": 204800
}
```

**Response (201 Created):** Same shape as Flow A Step 1.

### Step 3: Direct Upload to S3

Identical to Flow A Step 2.

### Step 4: Confirm Draft Upload

```http
POST /attachments/drafts/{draft_id}/confirm
```

**Request Body:** Same minimal shape as Flow A Step 3.
```json
{
  "s3_key": "USR001/attachments/a1b2c3d4-e5f6-7890_invoice.pdf",
  "remark": "March invoice"
}
```

**Response (201 Created):** Returns the Attachment object (with `draft_id` set, `serial_number` will be `null` until submission).

### Step 5: Submit Application with Draft

Pass `draft_id` in the application submission payload. The backend will atomically bind all confirmed draft attachments to the new serial number within the same database transaction.

```http
POST /applications/submission
```

**Request Body:**
```json
{
  "binding_id": 1,
  "draft_id": "550e8400-e29b-41d4-a716-446655440000",
  "form_data": { ... }
}
```

> `draft_id` is optional. Omit it if there are no attachments to bind.

---

## Managing Draft Attachments

While filling out a form, the user can inspect or remove attachments in the draft before submitting.

### List Draft Attachments

```http
GET /attachments/drafts/{draft_id}
```

**Response (200 OK):** Array of Attachment objects (filtered to the current user's uploads).

### Delete Draft Attachment

Removes the attachment record and its S3 object.

```http
DELETE /attachments/drafts/{draft_id}/{id}
```

**Response (204 No Content)**

---

## Managing Application Attachments

These endpoints operate on attachments already bound to an existing application.

### List Attachments

```http
GET /applications/{serial_number}/attachments?field_key=upload_receipt
```

The `field_key` query param is optional.

**Response (200 OK):**
```json
[
  {
    "id": 42,
    "field_key": "upload_receipt",
    "file_name": "invoice.pdf",
    "file_size": 204800,
    "content_type": "application/pdf",
    "status": "UPLOADED",
    "serial_number": "APP-1234",
    "draft_id": null,
    "remark": "March invoice",
    "uploaded_by": { "id": 1, "name": "Robert Chen" },
    "created_at": "2026-03-17T08:00:00Z"
  }
]
```

### Download Attachment

Files are in a private S3 bucket. Fetch a short-lived presigned download link:

```http
GET /applications/{serial_number}/attachments/{id}/download
```

**Response (200 OK):**
```json
{
  "download_url": "https://s3.amazonaws.com/bpm-attachments-dev/...",
  "file_name": "invoice.pdf",
  "expires_in": 300
}
```

Open `download_url` in a new tab or use an `<a>` tag. The backend sets the proper `Content-Disposition` header.

### Update Remark

```http
PATCH /applications/{serial_number}/attachments/{id}
```

**Request Body:**
```json
{
  "remark": "Updated remark text"
}
```

### Delete Attachment

Permanently removes the database record and S3 object.

```http
DELETE /applications/{serial_number}/attachments/{id}
```

**Response (204 No Content)**

---

## Attachment Response Shape

All endpoints that return an attachment object share the same shape:

```json
{
  "id": 42,
  "field_key": "upload_receipt",
  "file_name": "invoice.pdf",
  "file_size": 204800,
  "content_type": "application/pdf",
  "status": "UPLOADED",
  "serial_number": "APP-1234",
  "draft_id": null,
  "remark": "March invoice",
  "uploaded_by": { "id": 1, "name": "Robert Chen" },
  "created_at": "2026-03-17T08:00:00Z"
}
```

| Field | Notes |
|---|---|
| `status` | `PENDING` or `UPLOADED` |
| `serial_number` | Present on confirmed application attachments; `null` for unbound drafts |
| `draft_id` | Present while in draft state; `null` after binding to an application |

---

## Important Frontend Implementation Guidelines

### Handling "Replace File" Actions

The backend does not provide a dedicated "replace attachment" API. To simulate a "replace" action:

1. Upload the new file (full 3-step flow).
2. Call `DELETE` on the old attachment to remove the previous file.

This ensures the old file is only removed after the new upload succeeds.

### File Size Constraints

The backend does not reject files based on max size. Enforce your form builder's file size limits client-side before starting the presign step.

### Access Control

Only the **applicant** of an application instance is authorized to modify attachments (upload, update, delete). Draft attachments are owned by the user who uploaded them — the binding step verifies that all attachments in the draft belong to the submitting user.

---

## Admin API

Expired `PENDING` attachments (presigned but never confirmed) can be managed via the admin endpoints.

### List Expired Pending Attachments

```http
GET /attachments/admin/pending
```

### Purge an Expired Attachment

Deletes both the database record and the S3 object.

```http
DELETE /attachments/admin/pending/{id}
```

**Response (200 OK or 204 No Content)**

See `dev-utils/application-attachment-file/attachment-mngr.sh` for a CLI helper.

---

## Dev Utils / Sample Scripts

The attached scripts are contains ready-to-run shell scripts:

| Script | Purpose |
|---|---|
| `test-attachment-feature.sh` | End-to-end test of Flow A (existing application). Usage: `<HOST_URL> <AUTH_TOKEN> <SERIAL_NUMBER>` |
| `test-attachment-draft-flow.sh` | End-to-end test of Flow B (draft → submission). Usage: `<HOST_URL> <AUTH_TOKEN> [BINDING_ID]` |
| `attachment-mngr.sh` | Admin CLI for listing/purging expired pending uploads. Usage: `<HOST_URL> <AUTH_TOKEN> list\|purge [ID]` |
