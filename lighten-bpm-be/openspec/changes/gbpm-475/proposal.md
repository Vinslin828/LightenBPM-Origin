## Why

End users filling out form instances currently lack a way to upload supporting documents like images, PDFs, or reports. This feature is essential for many business processes (e.g., approval flows) that require attachments as evidence or context for decisions.

## What Changes

- **NEW** File Upload component for the form builder, allowing designers to configure upload constraints (file type, size, count).
- **NEW** Backend support for storing and managing file attachments associated with form instances.
- **NEW** Integration with S3-compatible storage for persistent file storage.
- **MODIFICATION** to the form instance data model to link attachments to instances and revisions.
- **MODIFICATION** to the form builder schema to support the `FILE_UPLOAD` component type.

## Capabilities

### New Capabilities
- `instance-attachments`: Provides APIs for uploading, listing, and removing attachments linked to form instances, including S3 integration and persistence in the database.

### Modified Capabilities
- `form-management`: Adds support for the `FILE_UPLOAD` component type in the form schema, including validation rules for file constraints (types, size, limits).

## Impact

- **Database**: Adds `InstanceAttachment` table to Prisma schema.
- **APIs**: New endpoints under `/bpm/attachments` (or similar) for file operations.
- **Storage**: Requires S3 bucket and corresponding IAM permissions in `infrastructure/application.yaml`.
- **Frontend**: New `FILE_UPLOAD` component (not covered in this backend-focused change, but affects the schema consumed by the frontend).
