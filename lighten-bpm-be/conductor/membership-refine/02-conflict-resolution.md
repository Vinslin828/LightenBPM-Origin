# Topic 2: Sync and Conflict Handling (Pending External System Confirmation)

## The Core Problem
When importing data, local membership records may overlap with the incoming remote data. We need to decide how to handle these overlaps to ensure the remote system acts as the source of truth without destroying valid local data (e.g., data entered via the fallback UI).

## Pending Decision
We need to confirm with the external system owner whether subsequent imports (after the initial full sync) are **Full History** or **Delta/Incremental Updates**.

### Scenario A: External System sends Delta Updates (Minor Updates)
If the external system only sends changes (e.g., "User A is HEAD from Jun-Aug"), we **cannot** simply delete overlapping local records, as this would erase valid history outside that 3-month window.
* **Required Solution (Cookie-Cutter / Truncate & Split):** 
  * If a local record overlaps the start/end of the remote record, we truncate the local record's `endDate` or `startDate`.
  * If the remote record falls entirely *within* a local record, we split the local record into two pieces (before and after the remote record).

### Scenario B: External System sends Full History Every Time
If the external system resends the complete history for a user every time, any local data not included in the payload is invalid.
* **Required Solution (Wipe & Replace):**
  * Delete all existing local memberships for the users included in the import.
  * Insert the new remote memberships exactly as provided.
