## 1. Setup and Module Creation

- [x] 1.1 Create `ScriptExecutionModule` structure in `src/script-execution/`.
- [x] 1.2 Register `ScriptExecutionModule` in `app.module.ts`.

## 2. Core Execution Service (isolated-vm)

- [x] 2.1 Implement `ScriptExecutionService` to manage `isolated-vm` isolates and contexts.
- [x] 2.2 Implement a restricted `fetch` wrapper for the sandbox using `isolated-vm` bridge.
- [x] 2.3 Add timeout (5s default) and memory limit (128MB default) configuration for scripts.
- [x] 2.4 Handle execution errors (syntax errors, runtime errors, timeouts) and map them to API responses.

## 3. API Controller & DTOs

- [x] 3.1 Create `ScriptExecutionController` with `POST /bpm/execution/fetch`.
- [x] 3.2 Define `FetchSnippetDto` for request validation (`function` as string).
- [x] 3.3 Ensure the response directly returns the script's execution result or standard error DTO.

## 4. Form Component Update

- [x] 4.1 Update `FormRevision` schema validation logic (if any) to recognize `API_FETCH`.
- [x] 4.2 Add `API_FETCH` to relevant enums or type definitions in `src/form/`.

## 5. Testing & Validation

- [x] 5.1 Write unit tests for `ScriptExecutionService` covering success, timeout, and restricted access scenarios.
- [x] 5.2 Write E2E tests for `POST /bpm/execution/fetch` covering:
    - [x] 5.2.1 Basic GET fetch from a public API (e.g., JSONPlaceholder) and verify data bypass.
    - [x] 5.2.2 Fetch using function-embedded dynamic values.
    - [x] 5.2.3 Error handling when the external API returns a non-200 status or connection fails.
- [x] 5.3 Verify that the `API_FETCH` component can be correctly saved and retrieved via form APIs.
