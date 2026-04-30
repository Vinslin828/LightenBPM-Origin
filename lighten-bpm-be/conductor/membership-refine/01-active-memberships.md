# Topic 1: Active Membership Constraints

## Core Principles
1. **Historical Record:** The system must keep a full history of memberships, but there can only be **one active membership** for a specific `(User, OrgUnit)` pair at any given time.
2. **Time Boundaries:** Memberships are tracked using a `[startDate, endDate)` model. The membership is active if `startDate <= current_date < endDate`.
3. **Role Switching (e.g., USER -> HEAD):** When a user's role changes within the same OrgUnit, the existing active membership must be terminated (setting its `endDate` to today), and a new membership record must be created starting today with the new `assignType`.(e.g., "User A is HEAD from Jun-Aug"), we **cannot** simply delete overlapping local records, as this would erase valid history outside that 3-month window.
* **Required Solution (Cookie-Cutter / Truncate & Split):** 
  * If a local record overlaps the start/end of the remote record, we truncate the local record's `endDate` or `startDate`.
  * If the remote record falls entirely *within* a local record, we split the local record into two pieces (before and after the remote record).
