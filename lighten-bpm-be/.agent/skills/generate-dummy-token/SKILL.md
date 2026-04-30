---
name: generate-dummy-token
description: Generates a dummy JWT token for development and testing. Use this when you need a mock token to test authenticated endpoints.
---

### Usage

Use the python script `dev-utils/generate-dummy-token.py` to generate tokens. This script creates a mock JWT that the backend's `AuthGuard` and `PermissionBuilder` use to identify the user and their permissions.

**Parameters:**
- `--sub` (required): The user's subject claim (Auth0 unique ID).
- `--email` (required): The user's email address.
- `--name` (required): The user's full name.
- `--code` (optional): The user's external code (Employee ID). Maps to the `code` claim.
- `--job-grade` (optional): User's job grade (Integer). Maps to the `Job_Grade` claim. Defaults to `30`.
- `--bpm-role` (optional): User's system role. Maps to the `BPM_Role` claim.
    - **Allowed Values**: `user` (default), `admin`.

**JWT Claims Mapping:**
| Script Parameter | JWT Payload Claim | Used By |
| :--- | :--- | :--- |
| `--sub` | `sub` | `UserService` (User lookup/sync) |
| `--job-grade` | `Job_Grade` | `PermissionBuilder` (Grade-based access) |
| `--bpm-role` | `BPM_Role` | `isAdminUser()` (Global Admin access) |

### Common Scenarios

**1. Generate a Standard User Token**
```bash
python3 dev-utils/generate-dummy-token.py --sub 'user-123' --email 'user@example.com' --name 'John Doe'
```

**2. Generate an Admin Token**
```bash
python3 dev-utils/generate-dummy-token.py --sub 'admin-456' --email 'admin@example.com' --name 'Admin User' --bpm-role 'admin'
```

**3. Generate a High-Grade User Token (e.g., for Managerial checks)**
```bash
python3 dev-utils/generate-dummy-token.py --sub 'mgr-789' --email 'mgr@example.com' --name 'Manager User' --job-grade 10
```

Return the generated token string to the user or use it in the `Authorization: Bearer <token>` header for API requests.
