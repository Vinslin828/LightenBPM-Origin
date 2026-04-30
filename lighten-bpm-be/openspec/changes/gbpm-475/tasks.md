# GBPM-475 File Upload Feature Tasks

- [x] 1. Update `prisma/schema.prisma` with `InstanceAttachment` model
- [x] 2. Run `make migrate-dev name=add_instance_attachments`
- [x] 3. Remove `public.` schema prefix from migration file (per user global rules)
- [x] 4. Install AWS SDKs (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- [x] 5. Implement `AttachmentModule` (service, controller, repository, dtos)
- [x] 6. Update `app.module.ts` to include `AttachmentModule`
- [x] 7. Update `infrastructure/application.yaml` with S3 Bucket and Task Role permissions
- [ ] 8. Verify functionality by E2E test scripts
