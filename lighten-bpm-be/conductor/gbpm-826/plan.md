# Plan: GBPM-826 — Pagination for GET /users

## Context

`GET /users` currently returns a flat array. This ticket adds standard `page`/`limit` params with a paginated response envelope — matching the exact pattern used by `GET /form/list`, `GET /workflow/list`, and application endpoints.

**Default limit per ticket spec: 50** (the system default `DEFAULT_PAGINATION_LIMIT = 10` is intentionally not used here).

**Response shape:** flat `PaginatedResponseDto<UserDto>` — no `{ success, data }` wrapper (the ticket example is aspirational; the real codebase does not use that envelope).

---

## Reference: Form List Pattern (Canonical)

```
Controller  → returns PaginatedResponseDto<ListFormRespDto>
              builds page/limit/totalPages from query defaults
Service     → returns { items: T[]; total: number }
Repository  → accepts skip/take, runs parallel count + findMany
```

The user module will follow this exact pattern.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/user/dto/list-user-query.dto.ts` | Extend `PaginationQueryDto`; export `DEFAULT_USER_LIMIT = 50` |
| `src/user/repository/user.repository.ts` | Accept page/limit, apply skip/take, return `{ items, total }` |
| `src/user/user.service.ts` | Change return type to `{ items: UserWithOrg[]; total: number }` |
| `src/user/user.controller.ts` | Build `PaginatedResponseDto<UserDto>`, default limit 50, replace `@ApiResponse` with `@ApiPaginatedResponse(UserDto)` |
| `src/user/user.service.spec.ts` | Update mock return shape, add pagination assertions |
| `src/user/user.controller.spec.ts` | Assert paginated response shape, add pagination cases |
| `e2e_tester/tests/test_user_management.py` | Fix broken tests + add pagination E2E cases |

---

## Step-by-Step Changes

### 1. `src/user/dto/list-user-query.dto.ts`

Extend `PaginationQueryDto` and export the user-specific default limit as the single source of truth:

```typescript
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const DEFAULT_USER_LIMIT = 50;

export class ListUserQueryDto extends PaginationQueryDto {
  // existing search and includeDeleted fields unchanged
}
```

Both the repository and the controller import `DEFAULT_USER_LIMIT` from here — no duplication.

### 2. `src/user/repository/user.repository.ts` — `findAllUsers()`

Mirror the form repository pattern — parallel count + findMany:

```typescript
import { DEFAULT_USER_LIMIT } from '../dto/list-user-query.dto';

async findAllUsers(
  query?: ListUserQueryDto,
): Promise<{ items: UserWithOrg[]; total: number }> {
  const where = { /* existing where-clause logic (unchanged) */ };
  const page = query?.page ?? 1;
  const limit = query?.limit ?? DEFAULT_USER_LIMIT;
  const skip = (page - 1) * limit;

  const [items, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({ where, include: this.userInclude, orderBy: { created_at: 'desc' }, skip, take: limit }),
    this.prisma.user.count({ where }),
  ]);

  return { items, total };
}
```

### 3. `src/user/user.service.ts` — `findAll()`

```typescript
async findAll(
  query?: ListUserQueryDto,
): Promise<{ items: UserWithOrg[]; total: number }> {
  const { items, total } = await this.userRepository.findAllUsers(query);
  const enriched = await Promise.all(
    items.map((u) => this.enrichWithResolvedOrg(u) as Promise<UserWithOrg>),
  );
  return { items: enriched, total };
}
```

### 4. `src/user/user.controller.ts` — `getUsers()`

Mirror `listForms` exactly:

```typescript
// imports to add:
// DEFAULT_USER_LIMIT from './dto/list-user-query.dto'
// PaginatedResponseDto, DEFAULT_PAGE from '../common/dto/pagination.dto'
// ApiPaginatedResponse from '../common/decorators/api-paginated-response.decorator'

@Get()
@ApiOperation({ summary: 'Retrieve a list of users', operationId: 'getUsers' })
@ApiPaginatedResponse(UserDto)  // replaces @ApiResponse({ status: 200, type: [UserDto] })
async getUsers(
  @Query() query?: ListUserQueryDto,
): Promise<PaginatedResponseDto<UserDto>> {
  const { items, total } = await this.userService.findAll(query);
  const page = query?.page || DEFAULT_PAGE;
  const limit = query?.limit || DEFAULT_USER_LIMIT;
  return {
    items: items.map((user) => UserDto.fromPrisma(user)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

> **Breaking change:** The response shape changes from `UserDto[]` to `PaginatedResponseDto<UserDto>`. Frontend consumers (`useUsers` hook, `getUsers` in domain-service.ts) must be updated per the ticket's Frontend Impact section.

---

## Response Shape

```json
{
  "items": [...],
  "total": 87,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

## Unit Test Updates

**`user.service.spec.ts`**:
- Change all `userRepository.findAllUsers` mocks to return `{ items: [...], total: N }` instead of a plain array
- Add test: pagination params forwarded to repository

**`user.controller.spec.ts`**:
- Assert response is `{ items, total, page, limit, totalPages }`
- Add test: no params → `page=1`, `limit=50`
- Add test: explicit `page=2&limit=10` → correct shape

---

## E2E Test Updates (`e2e_tester/tests/test_user_management.py`)

Two existing tests break because they assert against a flat list; both need updating:

**`test_list_users`** (currently: `assert any(u["id"] == ... for u in listed_users)`):
- Change to: `assert any(u["id"] == ... for u in listed_users["items"])`
- Also assert: `"total" in listed_users`, `listed_users["page"] == 1`, `listed_users["limit"] == 50`

**`test_list_users_with_filters`** (currently iterates response directly):
- Unwrap `response["items"]` before asserting on individual users

**New test cases to add**:
- `test_list_users_pagination`: request `page=1&limit=2`, assert `len(items) <= 2`, assert metadata fields present
- `test_list_users_pagination_with_search`: combine `search=` with `page=1&limit=5`, assert filtered + paginated

---

## Verification

1. `pnpm test -- --testPathPattern=src/user/` — all unit tests pass
2. `make build` — no TypeScript errors
3. `make lint` — no lint errors
4. Run E2E suite via `run-e2e-tests` skill
5. Manual: `GET /bpm/users` → `{ items:[...], total, page:1, limit:50, totalPages }`
6. Manual: `GET /bpm/users?search=john&page=1&limit=20` → filtered + paginated response

