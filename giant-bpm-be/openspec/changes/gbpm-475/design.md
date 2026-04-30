## Context

The system currently handles form schema and submission data, but does not support file attachments. The `gbpm-475` change introduces a File Upload component in the form builder and a backend service to handle binary data storage (using S3) and its association with form instances.

## Goals / Non-Goals

**Goals:**
- Provide a robust API for uploading, listing, and downloading attachments linked to form instances.
- Integrate with AWS S3 for secure and scalable binary storage.
- Support file metadata and user remarks for each attachment.
- Implement server-side validation for file size and type.

**Non-Goals:**
- File versioning (each upload is a new attachment record).
- In-browser file preview (handled via pre-signed URL downloads).
- Virus scanning or deep content inspection.

## Decisions

### Storage Architecture: AWS S3 + Metadata DB
We will store actual files in AWS S3 and keep metadata (filename, size, MIME type, S3 key) in a Prisma-managed `InstanceAttachment` table.
- **Rationale**: Keeps the database lean while leveraging S3 for high availability and low-cost storage of binary blobs.
- **Alternative**: Storing files as BLOBs in Postgres (rejected due to database performance and backup size concerns).

### Secure Access: Pre-signed URLs
The API will not stream file content directly. Instead, it will provide a temporary pre-signed S3 URL for downloading.
- **Rationale**: Offloads data transfer bandwidth to AWS and ensures access is time-bound and authenticated.
- **Alternative**: Direct streaming through the NestJS service (rejected for scalability/resource concerns).

### Component-Level Constraints
Constraints (max size, allowed types) will be stored in the form schema's `FILE_UPLOAD` component configuration and validated both on the client and server.
- **Rationale**: Ensures a consistent user experience while maintaining security on the backend.

## Risks / Trade-offs

- **[Risk] S3 Availability/Config Error** → **Mitigation**: Implement robust error handling and logging for S3 operations. Use AWS SDK v3 for modern, modular integration.
- **[Risk] Orphaned S3 Files** → **Mitigation**: Ensure S3 keys are deleted or marked for cleanup when `InstanceAttachment` records are permanently removed.
