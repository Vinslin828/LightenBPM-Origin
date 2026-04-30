#!/bin/bash
#
#Command explain
# 1. `npx`: A command-line tool that comes with Node.js (npm). It finds and executes a package binary (like ts-node) without needing you to install it globally on your machine. It will look in your local node_modules first, and if not found, it can download/execute it temporarily.
# 2. `ts-node`: A TypeScript execution engine for Node.js. It allows you to run TypeScript files (.ts) directly by compiling them to JavaScript on the fly in memory, skipping the need for a manual tsc (compile) step.
# 3. `reproduce_issue.ts`: The specific TypeScript file you want to execute.
#

npx ts-node reproduce_issue.ts
