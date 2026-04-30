---
name: run-e2e-tests
description: Runs the end-to-end (E2E) test suite (in `e2e_tester` directory) for the application using Docker. Use this to verify system behavior, specifically for regression testing or validating new features.
---

### Usage

Execute the tests from the `e2e_tester` directory using `docker-compose`.

**Prerequisites:**
- The application stack (backend, database) must be running.

**Command:**
```bash
cd e2e_tester && docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester
```

**Options:**
- Target a specific environment (default is `local`):
  ```bash
  cd e2e_tester && docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester --env staging
  ```
- Keep test data for debugging (skips cleanup):
  ```bash
  cd e2e_tester && docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester --keep-data
  ```
- Generate JUnit XML Report:
  ```bash
  cd e2e_tester && docker-compose -f docker-compose.e2e.yml run --build --rm -e JUNIT_REPORT_PATH="reports/results.xml" e2e-tester
  ```

**Important Notes:**
- Always build (`--build`) to ensure the latest test code is used.
- Use `--rm` to clean up the test container after execution.
