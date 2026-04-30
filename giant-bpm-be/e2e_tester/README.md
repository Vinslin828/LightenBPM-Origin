# Python E2E Test Suite

This directory contains the universal end-to-end test suite for the Giant BPM BE application.

## Overview

This is a standalone, Docker-based test runner that can target any application endpoint, whether it's running on your local machine or on a remote server.

It uses Docker's **host networking** mode, which allows the test container to access the host machine and the public internet.

## Prerequisites

- Python 3.11+ (for local development/IDE support)
- `pip`
- Docker and Docker Compose

## Configuration

The test runner is configured by adding JSON files to the `environments/` directory.

- `environments/local.json`: Used by the Docker container to target the host machine. It points to `http://host.docker.internal:3000`.
- `environments/local-native.json`: Used when running tests directly on the host (not in Docker). It points to `http://localhost:3000`.
- **Adding new environments:** To test a remote server, create a new file (e.g., `environments/staging.json`) with the target URL:
  ```json
  {
    "base_url": "https://staging-api.your-domain.com"
  }
  ```

## Running Tests with Docker

The primary way to run tests is using the `docker-compose run` command. This creates a fresh container for the test run and removes it automatically (`--rm`).

#### Base Command (Testing Local Environment)

1.  Ensure your local application is running.
2.  From the `e2e_tester` directory, execute:
    ```bash
    docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester
    ```

---


### Command Variations

You can combine flags to target different environments and generate reports.

##### 1. Targeting a Different Environment

To run tests against an environment other than `local` (e.g., `staging`), add the `--env` flag to the end of the command.

```bash
# Example: Testing the 'staging' environment
    docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester --env staging
```

##### 2. Generating a JUnit XML Report

To generate a report, use the `-e` flag to set the `JUNIT_REPORT_PATH` environment variable. The report will be saved in the `reports/` directory.

```bash
# Example: Testing the 'local' environment and generating a report
    docker-compose -f docker-compose.e2e.yml run --build --rm \
      -e JUNIT_REPORT_PATH="reports/results.xml" \
      e2e-tester
```

##### 3. Targeting an Environment AND Generating a Report (Combined)

This is the most common use case for CI/CD. To do both at the same time, simply use both flags.

```bash
# Example: Testing 'staging' AND generating a report
    docker-compose -f docker-compose.e2e.yml run --build --rm \
      -e JUNIT_REPORT_PATH="reports/staging-results.xml" \
      e2e-tester --env staging
```

##### 4. Debugging: Keeping Test Data

By default, tests are designed to be clean and self-contained, meaning they delete any data they create (like forms, users, etc.) when they finish.

However, for debugging purposes, you might want to inspect the data in the database *after* a test has run. To do this, use the `--keep-data` flag. This tells the test suite to skip the automatic cleanup process.

```bash
# Example: Run tests against 'local' but do not delete the test data
docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester --keep-data
```

**Use Case:** If a test is failing, you can run it with `--keep-data` and then manually inspect the API or database to understand the state of the application at the point of failure.

**Warning:** Remember that using this flag will leave test data in your database, which might interfere with subsequent test runs.

---

### Stopping the Application Environment

The `docker-compose run` commands above only create and run the test container. They do not stop the application environment you started separately.

To stop your main application containers (e.g., the NestJS app and database), navigate to your **project root directory** and run:

```bash
docker-compose down
```

This command stops and removes the containers and the network defined in the root `docker-compose.yml`.

**WARNING:** To also delete the database volume (which will erase all data), use the `-v` flag.

```bash
# This will permanently delete all data in your local test database
docker-compose down -v
```

## Local Development (Without Docker)

You can also run the tests directly on your host machine.

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
2.  **Run Pytest:** Use the `local-native` environment to target `localhost`.
    ```bash
    pytest --env local-native
    ```
    To keep data when running locally, use the flag directly with pytest:
    ```bash
    pytest --env local-native --keep-data
```
---
