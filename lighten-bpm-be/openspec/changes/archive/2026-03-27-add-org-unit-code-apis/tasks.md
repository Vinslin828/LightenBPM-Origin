# Tasks: Add Org Unit Code APIs

## 1. Repository Layer
- [x] 1.1 Update `OrgUnitRepository`:
    - Add `updateOrgUnitByCode(code: string, dto: UpdateOrgUnitDto)`.
    - Add `deleteOrgUnitByCode(code: string)`.
    - Add `findOrgUnitHeadMembershipsByCode(code: string)`.
    - Add `findOrgUnitUserMembershipsByCode(code: string)`.

## 2. Service Layer
- [x] 2.1 Update `OrgUnitService`:
    - Add `updateByCode(code: string, dto: UpdateOrgUnitDto)`.
    - Add `removeByCode(code: string)`.
    - Add `getOrgUnitHeadsByCode(code: string)`.
    - Add `getOrgUnitMembersByCode(code: string)`.

## 3. Controller Layer
- [x] 3.1 Update `OrgUnitController`:
    - Add `GET /org-units/code/:code` -> `findOneByCode`.
    - Add `PATCH /org-units/code/:code` -> `updateByCode`.
    - Add `DELETE /org-units/code/:code` -> `removeByCode`.
    - Add `GET /org-units/code/:code/heads` -> `getOrgUnitHeadsByCode`.
    - Add `GET /org-units/code/:code/users` -> `getOrgUnitUsersByCode`.

## 4. Verification
- [x] 4.1 Run `make test` to ensure no regressions.
- [x] 4.2 Manual verification or add E2E test for new endpoints (Optional but recommended).