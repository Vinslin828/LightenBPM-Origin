# Tasks: Add User Code and Soft Delete

## 1. Database Schema
- [x] 1.1 Update `User` model in `schema.prisma`:
    - Add `code String @unique`.
    - Add `deleted_at DateTime?` for soft delete.
- [x] 1.2 Generate Migration `add_user_code_and_soft_delete`:
    - Ensure migration script populates `code` for existing users (using `sub` as fallback).

## 2. Codebase Refactoring
- [x] 2.1 Update `User` Entity/DTOs:
    - Add `code` field to `UserDto`, `CreateUserDto`, and `IdToken`.
- [x] 2.2 Update `UserRepository`:
    - Add `findUserByCode(code: string)`.
    - Update find methods to filter out soft-deleted users (`deleted_at: null`).
    - Implement soft delete in `delete` method.
- [x] 2.3 Update `UserService`:
    - Ensure user creation populates `code`.
    - Add `findByCode`, `updateByCode`, `removeByCode`.
- [x] 2.4 Update `UserController`:
    - Add endpoints: `GET /users/code/:code`, `PUT /users/code/:code`, `DELETE /users/code/:code`.

## 3. Verification
- [x] 3.1 Run migration.
- [x] 3.2 Verify existing users (and system user in seed) have `code`.
- [x] 3.3 Run tests and verify build compilation.
