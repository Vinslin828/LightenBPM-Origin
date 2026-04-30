-- One-off audit: find userDefaultOrg rows pointing at soft-deleted org units.
-- These records could have been written by bulkImport before the deleted_at
-- guard was added.  Run READ-ONLY first (the SELECT below) to assess scope,
-- then use the DELETE at the bottom to repair if records are found.

-- ============================================================
-- 1. READ-ONLY AUDIT — identify affected rows
-- ============================================================
SELECT
  udo.user_id,
  u.code   AS user_code,
  udo.org_unit_id,
  ou.code  AS org_code,
  ou.deleted_at
FROM "userDefaultOrg" udo
JOIN "user"     u  ON u.id  = udo.user_id
JOIN "orgUnit"  ou ON ou.id = odo.org_unit_id
WHERE ou.deleted_at IS NOT NULL;

-- ============================================================
-- 2. REPAIR — remove corrupted rows (run only after audit)
-- ============================================================
-- DELETE FROM "userDefaultOrg"
-- WHERE org_unit_id IN (
--   SELECT id FROM "orgUnit" WHERE deleted_at IS NOT NULL
-- );
