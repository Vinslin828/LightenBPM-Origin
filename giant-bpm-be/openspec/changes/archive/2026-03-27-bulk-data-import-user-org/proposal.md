## Why

Customers need a way to bulk import Users, Organization Units (OrgUnits), and OrgMemberships from external systems. Currently, there is no efficient way to sync large datasets, and existing CRUD APIs are designed for single-resource operations without transactional rollback across multiple related entities.

## What Changes

- **New Bulk Import API**: A single endpoint to import arrays of Users, OrgUnits, and OrgMemberships.
- **Code-Based Relationship Resolution**: Ability to define relationships using logical `code` identifiers instead of internal database `id`s.
- **Transactional Consistency**: All resources in a single import request are processed within a database transaction. If one row fails, all changes are rolled back.
- **Detailed Error Reporting**: Error messages will pinpoint exactly which row (index) and resource caused the failure.
- **Repository Refactoring**: Update `UserRepository` and `OrgUnitRepository` to support optional Prisma transaction clients for multi-step operations.

## Capabilities

### New Capabilities
- `bulk-data-import`: Provides the logic and API for bulk importing users and organization structures.

### Modified Capabilities
- (None)

## Impact

- **Affected Code**: `UserRepository`, `OrgUnitRepository`, `MigrationService`, `MigrationController`.
- **APIs**: New `POST /import/bulk` endpoint in `MigrationController`.
- **Dependencies**: Utilizes existing `PrismaService` transaction capabilities.
