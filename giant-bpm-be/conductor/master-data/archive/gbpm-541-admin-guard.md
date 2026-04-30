# GBPM-541: Admin Guard for Master Data Editing APIs

## Goal

Restrict all master data write operations (schema + record CUD) to admin users only, mitigating SSRF risk on the `POST external-api/test` endpoint.

## Scope

Endpoints to protect:

- `POST /bpm/master-data` — create dataset
- `DELETE /bpm/master-data/:code` — delete dataset
- `PATCH /bpm/master-data/:code/external-config` — update external API config
- `POST /bpm/master-data/external-api/test` — test external API
- `POST /bpm/master-data/import` — import dataset
- `POST /bpm/master-data/:code/records` — create record
- `PUT /bpm/master-data/:code/records/:id` — update record
- `DELETE /bpm/master-data/:code/records/:id` — delete record

Read-only endpoints (`GET` list/detail/export, `GET` records) remain accessible to all authenticated users.

## Rough Approach

1. Create an `AdminGuard` (or reuse if one exists) that checks the user's role from the JWT/auth context.
2. Apply the guard to the write endpoints listed above via `@UseGuards(AdminGuard)` at method level, or group them in a separate controller with the guard at class level.
3. Define what "admin" means — check `AuthUser` for a role field or a permission flag. If the current RBAC system has a `MANAGE` action on master data, that could serve as the admin check.
4. Return `403 Forbidden` for non-admin users attempting write operations.
5. Add E2E test cases: non-admin user blocked from create/update/delete, admin user succeeds.
