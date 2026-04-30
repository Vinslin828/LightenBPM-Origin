## Context

The Form Builder requires a button component that can trigger external API fetches. Since the backend needs to execute these fetches to handle authentication or complex processing that shouldn't happen purely on the client-side, we need a secure way to execute user-defined JavaScript snippets.

The system currently uses `isolated-vm` in some areas (identified in `package.json`), which provides a secure, low-overhead way to execute untrusted JavaScript code in a separate V8 isolate.

## Goals / Non-Goals

**Goals:**
- Provide a secure API for executing fetch snippets.
- Use `isolated-vm` to sandbox snippet execution.
- Standardize the snippet syntax for easier usage by form administrators.

**Non-Goals:**
- Allowing arbitrary access to the backend's filesystem or environment variables.
- Supporting long-running scripts (execution must be time-limited).
- Providing a full-featured Node.js environment in the sandbox.

## Decisions

### 1. Sandboxing Engine: `isolated-vm`
- **Rationale**: `isolated-vm` is already in the project and provides high isolation between scripts and the main process, preventing event loop blocking and memory leaks.
- **Alternatives**: `vm2` (security vulnerabilities), `vm` (no isolation), Docker containers (too heavy).

### 2. Snippet Syntax: Async Function Wrapper
- **Rationale**: Fetching is asynchronous by nature. Wrapping the script in an `async` function allows for clean `await` syntax.
- **Decision**: The logic will be provided as the body of an async function via the `function` property.
- **Example**:
  ```javascript
  const result = await fetch('https://api.example.com/data', { method: 'POST', body: JSON.stringify({ id: 123 }) });
  return await result.json();
  ```

### 3. Execution Environment (The "Bridge")
- **Rationale**: We need to expose a limited `fetch` function to the isolate.
- **Decision**: Inject a `fetch` wrapper that enforces timeouts and restricted headers.

### 4. API Interface
- **Endpoint**: `POST /bpm/execution/fetch`
- **Request Payload**:
  ```json
  {
    "function": "..."
  }
  ```
- **Response Payload**: Direct JSON-serialized result of the function's `return` statement.
- **Error Response**: Standard NestJS error DTO with appropriate HTTP status codes (e.g., 400 for syntax errors, 408 for timeouts).

## Risks / Trade-offs

- **[Risk] Resource Exhaustion**: Malicious scripts could consume excessive CPU or memory. → **Mitigation**: Set strict memory limits and execution timeouts (e.g., 5s) in `isolated-vm`.
- **[Risk] Network Security**: Snippets could be used to probe the internal network. → **Mitigation**: Ensure the fetch wrapper only allows requests to a whitelist of domains (if applicable) or restricted external URLs. (To be refined in detailed spec).
