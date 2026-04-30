# Plan: Create Dev Script for GBPM-475 Attachment Feature Testing

## Objective
Generate a shell script `dev-utils/test-attachment-feature.sh` to facilitate testing the file upload and attachment flow against any deployed environment (including dev).

## Key Files & Context
- **Feature description:** GBPM-475 (`file_attachment_feature.md`).
- **Endpoints to test:**
  - `POST /bpm/applications/:serial_number/attachments/presign-upload`
  - `PUT <S3_PRESIGNED_URL>`
  - `POST /bpm/applications/:serial_number/attachments` (Confirm)
  - `GET /bpm/applications/:serial_number/attachments` (List)
  - `PATCH /bpm/applications/:serial_number/attachments/:id` (Update Remark)
  - `GET /bpm/applications/:serial_number/attachments/:id/download` (Download)
  - `DELETE /bpm/applications/:serial_number/attachments/:id` (Delete)

## Implementation Steps
1. Create `dev-utils/test-attachment-feature.sh` with execution permissions (`chmod +x`).
2. Script will accept 3 arguments:
   - `HOST_URL` (e.g. `https://api-dev.mp-dev.ds.lightencycling.com`)
   - `AUTH_TOKEN` (The bearer token for an authenticated user)
   - `SERIAL_NUMBER` (The application instance serial number to attach files to)
3. Script logic:
   - Create a dummy test file locally (e.g., 100KB `.txt` file).
   - Step 1: Request a presign-upload URL.
   - Step 2: Upload the dummy file directly to the S3 bucket using `curl -X PUT`.
   - Step 3: Call `confirm-upload` to attach the file internally.
   - Step 4: List attachments for the `SERIAL_NUMBER` and verify the file is listed.
   - Step 5: Update the remark via `PATCH`.
   - Step 6: Get the `presign-download` URL for the file and attempt downloading it to verify it works.
   - Step 7: Delete the attachment and verify it's removed.
   - Step 8: Clean up the local dummy files.
4. Ensure the script gracefully handles missing arguments and uses `jq` to parse API responses.

## Verification & Testing
- Upon completion, I will run the script (or the user can run it) against `https://api-dev.mp-dev.ds.lightencycling.com` using a valid user token and serial number.
