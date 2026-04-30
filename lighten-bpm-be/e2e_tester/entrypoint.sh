#!/bin/sh
set -e

# This script is a wrapper for the pytest command.
# It checks for a JUNIT_REPORT_PATH environment variable and, if set,
# adds the --junitxml flag to generate a test report.

JUNIT_FLAG=""
if [ -n "$JUNIT_REPORT_PATH" ]; then
  JUNIT_FLAG="--junitxml=$JUNIT_REPORT_PATH"
  echo "JUnit XML report will be generated at: $JUNIT_REPORT_PATH"
fi

# The `command` from docker-compose.yml is passed as arguments ("$@") to this script.
# We then execute pytest with the optional report flag and these arguments.
exec pytest $JUNIT_FLAG "$@"
