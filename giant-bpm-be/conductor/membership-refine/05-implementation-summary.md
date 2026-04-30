# Membership Delta Sync — Implementation Summary

**Commit:** `e784d86` (amended from `9ccbef8` after code review)
**Date:** 2026-04-09
**Branch:** `develop`

---

## What Was Built

Replaced the bulk import's membership conflict detection (which threw `400 Bad Request` on any overlap) with a **cookie-cutter delta sync** strategy. The external system is now the single source of truth: any local membership records that overlap an incoming remote record are resolved before the remote record is inserted.

---

## Cookie-Cutter Rules

For each incoming remote record **R = [startR, endR]** and any overlapping local record **L = [startL, endL]**:

| Case | Condition | Action on L |
|------|-----------|-------------|
| No overlap | R entirely before/after L | No-op |
| R clips L's tail | `startL < startR < endL ≤ endR` | `UPDATE L.endDate = R.startDate` |
| R clips L's head | `startR ≤ startL < endR < endL` | `UPDATE L.startDate = R.endDate` |
| R swallows L | `startR ≤ startL AND endR ≥ endL` | `DELETE L` |
| L contains R | `startL < startR AND endR < endL` | `UPDATE L.endDate = R.startDate` (tail dropped — no split) |

The "L contains R" rule was the key design decision from the 2026-04-09 meeting: when the remote record falls inside a local window, the local record is truncated to the left boundary of the remote record. The trailing period `[R.endDate, L.endDate)` is **discarded** (remote is source of truth beyond its own window).

---

## Files Changed

### `src/org-unit/repository/org-unit.repository.ts`
- **Added** `findAllOverlappingMemberships(userId, orgUnitId, startDate, endDate, tx?)` — returns all (not just the first) overlapping membership records using the standard range-overlap predicate (`start_date < endDate AND end_date > startDate`).
- **Modified** `hardDeleteOrgMembership(mappingId, tx?)` — added optional `tx` parameter so it can participate in the bulk import transaction.

### `src/org-unit/org-unit.service.ts`
- **No net change.** An initial draft of `applyDeltaMembershipImport` was added here but removed after code review identified it as dead code (the migration service inlines the logic directly and the ESLint type-resolution rules prevented cross-module service injection in this context). The two imports added exclusively for that method (`AssignType`, `PrismaTransactionClient`) were also reverted.

### `src/migration/migration.service.ts`
- **Replaced** the membership import loop's conflict handling. The old code called `findOverlappingMembership` and threw on any overlap. The new code calls `findAllOverlappingMemberships` and applies the cookie-cutter inline.
- **Fixed** `isDeleted` handling: the flag now only closes a membership if `existing.end_date > new Date()`. Historical records (end date already in the past) are left untouched.

### `src/migration/dto/bulk-import.dto.ts`
- Marked `isDeleted` on `OrgMembershipImportDto` as `@deprecated`. The external system should end memberships by sending a record with an explicit `endDate` instead.

### `e2e_tester/tests/test_bulk_import.py`
- **Replaced** `test_bulk_import_overlap_prevention` (which expected `400`) with `test_bulk_import_overlap_prevention_replaced_by_cookie_cutter` (which expects `201` and verifies resolution).
- **Added** 7 new tests covering all cookie-cutter cases and both `isDeleted` behaviors. Tests use a **two-org isolation pattern**: `def_org` absorbs the indefinite USER membership auto-created by `POST /users`, while `test_org` is clean for cookie-cutter assertions.

---

## Key Design Decisions

### No Split on "L Contains R"
The original plan doc (`02-conflict-resolution.md`) described a split into two pieces. After the 2026-04-09 meeting, this was revised: only the left piece `[L.start, R.start)` is kept. The right piece `[R.end, L.end)` is dropped because the external system is authoritative beyond its own window.

### `isDeleted` Deprecation
The flag is being phased out. In the current version it still works for closing active memberships, but has no effect on historical records. Future imports should use explicit `endDate` values instead.

### Management Interfaces Preserved
All existing CRUD endpoints (`POST /org-units/memberships`, `PATCH`, `DELETE`, `DELETE /hard`) remain unchanged. The overlap guard on the manual creation path (`createOrgMembership` in the service) is intentionally kept — it protects against accidental overlaps from the UI/API. The cookie-cutter bypass only applies to the bulk import path.

### `endDate` Sentinel
`null` is never used for open-ended memberships. All memberships use `INDEFINITE_MEMBERSHIP_END_DATE = 2999-12-31T23:59:59Z` as the sentinel for "no planned end date".

### Cookie-Cutter Logic Lives in the Migration Service
The cookie-cutter conflict resolution is implemented inline in `MigrationService.bulkImport` rather than as a shared service method. This was a deliberate outcome of the code review: an initial `applyDeltaMembershipImport` method added to `OrgUnitService` was identified as dead code (never called) because ESLint's `@typescript-eslint/no-unsafe-call` rule flagged cross-module service injection in the migration context. Keeping the logic inline is consistent with how `MigrationService` already uses `OrgUnitRepository` directly and avoids maintaining two copies. If the logic is ever needed by a second caller, it should be extracted then.

---

## Pending Work

- **Topic 4 (API optimization):** The import loop still processes memberships one at a time. Once the delta sync logic is stable, it should be refactored to use batch lookups and bulk operations (see `04-api-optimization.md`).
- **`isDeleted` removal:** Remove the field from `OrgMembershipImportDto` once the external system has migrated to explicit `endDate`-based closure.
