[Pre-conditions]

On 'Operation Home'.

No pre-existing Mock_Org_076 / Mock_Org_077 / Mock_Org_078_role data in the system.

[How to reproduce the problem]

Log in to the GIANT BPM platform with admin account.

Call POST /bpm/import/bulk with the following JSON payload, where carol-user-110's defaultOrgCode is set to a non-existent org Mock_Org_NOT_EXIST_D:

{
  "orgUnits": [
    { "code": "Mock_Org_076", "name": "mock_Org_076", "type": "ORG_UNIT", "isDeleted": false },
    { "code": "Mock_Org_077", "name": "mock_Org_077", "type": "ORG_UNIT", "isDeleted": false, "parentCode": "Mock_Org_076" },
    { "code": "Mock_Org_078_role", "name": "mock_Org_078_role", "type": "ROLE", "isDeleted": false }
  ],
  "users": [
    { "code": "carol-user-109", "name": "userName-109", "jobGrade": 70, "defaultOrgCode": "Mock_Org_076", "isDeleted": false, "email": "user_109@yopmail.com" },
    { "code": "carol-user-111", "name": "userName-111", "jobGrade": 40, "defaultOrgCode": "Mock_Org_076", "isDeleted": false, "email": "user_111@yopmail.com" },
    { "code": "carol-user-110", "name": "userName-110", "jobGrade": 60, "defaultOrgCode": "Mock_Org_NOT_EXIST_D", "isDeleted": false, "email": "user_110@yopmail.com" },
    { "code": "carol-user-112", "name": "userName-112", "jobGrade": 30, "defaultOrgCode": "Mock_Org_077", "isDeleted": false, "email": "user_112@yopmail.com" }
  ],
  "memberships": [
    { "userCode": "carol-user-109", "orgUnitCode": "Mock_Org_076", "assignType": "HEAD", "startDate": "2026-04-01", "endDate": "2026-05-30", "isDeleted": false },
    { "userCode": "carol-user-111", "orgUnitCode": "Mock_Org_076", "assignType": "USER", "startDate": "2026-04-01", "endDate": "2026-05-30", "isDeleted": false },
    { "userCode": "carol-user-110", "orgUnitCode": "Mock_Org_077", "assignType": "HEAD", "startDate": "2026-04-01", "endDate": "2026-05-30", "isDeleted": false },
    { "userCode": "carol-user-112", "orgUnitCode": "Mock_Org_077", "assignType": "USER", "startDate": "2026-04-01", "endDate": "2026-05-30", "isDeleted": false },
    { "userCode": "carol-user-111", "orgUnitCode": "Mock_Org_078_role", "assignType": "USER", "startDate": "2026-04-01", "endDate": "2026-05-30", "isDeleted": false }
  ]
}

API returns 201 Created (success) — no validation error.

Navigate to User Management → select userName-110 (carol-user-110).

Observe the User details and Organization list.

[Actual Result]
The import succeeds without any error. carol-user-110's defaultOrgCode is silently changed to Mock_Org_077 (the org assigned via membership), instead of the requested Unassigned.

In User Management, carol-user-110 shows:

Default Organization: mock_Org_077

Organization list: mock_Org_077 (2026/04/01 - 2026/05/30) with "Default" label

The API did not reject the invalid defaultOrgCode nor return any error message.

[Expected Result]
The entire batch should be rolled back as per the API's transactional design. The system should NOT silently substitute the defaultOrgCode with another organization.
