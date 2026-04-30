---
name: tailing-space-remover
description: Remove tailing whitespace from source code files to maintain clean code standards.
license: MIT
metadata:
  author: Gemini
  version: "1.0"
---

# Tailing Space Remover

This skill automates the removal of tailing whitespace from one or more files. It is specifically designed to work on macOS (`darwin`) using the BSD `sed` utility.

**Input**: A file path, a directory, or a glob pattern. If omitted, it will attempt to identify changed files in the current context.

**Steps**

1. **Identify Target Files**
   - If a path is provided, use it.
   - If a directory is provided, find all relevant source files recursively (e.g., `.ts`, `.py`, `.md`, `.sql`).
   - If no path is provided, look for files mentioned in the recent conversation or modified in the workspace.

2. **Execute Removal**
   For each identified file, run the following command:
   ```bash
   sed -i '' 's/[[:space:]]*$//' <file_path>
   ```

3. **Verify and Format (Optional but Recommended)**
   - For TypeScript/JSON/Markdown files, it is recommended to follow up with:
     ```bash
     make format
     ```
   - For Python files, manually verify that no tailing spaces remain.

4. **Report Results**
   - List the files that were processed.
   - Confirm that tailing spaces have been eliminated.

**Guardrails**
- **MacOS Specific**: The `-i ''` flag is specific to BSD `sed`. If running on Linux, this flag would need to be changed to `-i`.
- **Backup**: This command modifies files in-place. Ensure changes are tracked in git before running on large batches.
- **Binary Files**: Do NOT run this on binary files (images, PDFs, etc.).
