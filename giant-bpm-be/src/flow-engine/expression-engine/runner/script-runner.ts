/**
 * Script Runner
 *
 * Safely runs JavaScript code in an isolated V8 context using isolated-vm.
 * Supports both inline expressions and function-style code with statements.
 *
 * Security features:
 * - Memory limit (8MB default)
 * - Execution timeout (1 second default)
 * - No access to Node.js APIs or file system
 *
 * Runtime context:
 * - Supports injecting async functions (getFormField, getMasterData, etc.)
 * - Functions are called synchronously from the isolate using applySyncPromise
 */

import ivm from 'isolated-vm';

export interface ScriptRunnerOptions {
  /** Memory limit in MB (default: 8) */
  memoryLimit?: number;
  /** Execution timeout in milliseconds (default: 1000) */
  timeout?: number;
}

export interface ScriptRunResult {
  success: boolean;
  value?: unknown;
  error?: string;
}

/**
 * Runtime context with functions that can be called from within the isolate.
 * All functions should return Promises.
 */
export interface RuntimeContext {
  getFormField?: (fieldId: string) => Promise<Record<string, unknown>>;
  getApplicantProfile?: () => Promise<Record<string, unknown>>;
  getApplication?: () => Promise<Record<string, unknown>>;
  getMasterData?: (
    name: string,
    options?: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  getCurrentNode?: () => Promise<Record<string, unknown>>;
  fetch?: (
    url: string,
    options?: Record<string, unknown>,
  ) => Promise<{
    status: number;
    statusText: string;
    ok: boolean;
    headers: Record<string, string>;
    body: string;
  }>;
}

/**
 * Sample runtime context for validation.
 * Injects mock functions that return sample values.
 * Used by expression validators to test-execute expressions.
 */
export const SAMPLE_RUNTIME_CONTEXT: RuntimeContext = {
  getFormField: () => Promise.resolve({ value: undefined }),
  getApplicantProfile: () => Promise.resolve({}),
  getApplication: () => Promise.resolve({}),
  getMasterData: () => Promise.resolve([]),
  getCurrentNode: () =>
    Promise.resolve({
      id: 0,
      publicId: '',
      instanceId: 0,
      nodeKey: '',
      iteration: 0,
      subflowInstanceId: null,
      nodeType: '',
      status: '',
      result: null,
      startedAt: 0,
      completedAt: null,
      dueDate: null,
      createdAt: 0,
      updatedAt: 0,
      approverId: { current: [], prev: [], next: [] },
    }),
  fetch: () =>
    Promise.resolve({
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: {},
      body: '{}',
    }),
};

const DEFAULT_OPTIONS: Required<ScriptRunnerOptions> = {
  memoryLimit: 8,
  timeout: 10000,
};

/**
 * Wrap code based on its format for execution
 *
 * 1. Function definition: "function xxx() {...}" → define and call
 * 2. Statements with return: "const a = 1; return a;" → wrap in IIFE
 * 3. Expression: "a > 5" → wrap in parentheses
 */
function wrapCode(code: string): string {
  // Strip trailing semicolons to avoid misclassifying single expressions as statements
  // e.g. `getMasterData("x")[0].value;` should be treated as an expression, not a statement block
  const trimmed = code.trim().replace(/;+$/, '');

  // Already an expression (e.g. IIFE or function expression call) — wrap in parens only
  if (trimmed.startsWith('(')) {
    return `(${trimmed})`;
  }

  // Strip leading single-line and multi-line comments before checking for function definition
  // e.g. `// comment\nfunction expression() { ... }` should be detected as a function definition
  const withoutLeadingComments = trimmed
    .replace(/^(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*/g, '')
    .trim();

  // Check if code is a function definition (starts with "function xxx(")
  const funcMatch = withoutLeadingComments.match(/^function\s+(\w+)\s*\(/);
  if (funcMatch) {
    const funcName = funcMatch[1];
    return `${trimmed}; ${funcName}();`;
  }

  // Check if code has return statement → wrap in IIFE
  const hasReturn = /\breturn\b/.test(trimmed);
  if (hasReturn) {
    return `(function() { ${trimmed} })()`;
  }

  // Check if code has statements (variable declarations, multiple statements) → wrap in IIFE
  const hasStatements =
    /\b(const|let|var)\b/.test(trimmed) || trimmed.includes(';');
  if (hasStatements) {
    return `(function() { ${trimmed} })()`;
  }

  // Otherwise treat as expression
  return `(${trimmed})`;
}

/**
 * Run JavaScript code in an isolated VM
 *
 * Supports three formats:
 * 1. Inline expression: "a + b > 100"
 * 2. Statements with return: "const x = a + b; return x > 100;"
 * 3. Function definition: "function condition() { return x > 100; }"
 *
 * @param code - JavaScript code to run
 * @param runtimeContext - Optional context with functions to inject (getFormField, etc.)
 * @param options - Runner options (memory limit, timeout)
 * @returns Run result with success status and value or error
 *
 * @example
 * // Inline expression
 * await runScript("5 + 3 > 7"); // { success: true, value: true }
 *
 * // With runtime context
 * await runScript(
 *   'getFormField("amount").value > 5000',
 *   { getFormField: async (id) => ({ value: formData[id] }) }
 * ); // { success: true, value: true }
 *
 * // Complex validation with loop
 * await runScript(`
 *   const ids = ["field1", "field2"];
 *   for (const id of ids) {
 *     if (!getFormField(id).value) return false;
 *   }
 *   return true;
 * `, { getFormField: async (id) => ({ value: formData[id] }) });
 */
export async function runScript(
  code: string,
  runtimeContext?: RuntimeContext,
  options: ScriptRunnerOptions = {},
): Promise<ScriptRunResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let isolate: ivm.Isolate | null = null;

  try {
    // Create a new isolate with memory limit
    isolate = new ivm.Isolate({ memoryLimit: opts.memoryLimit });

    // Create a new context within the isolate
    const context = await isolate.createContext();
    const jail = context.global;

    // Set up a basic global object
    await jail.set('global', jail.derefInto());

    // Inject runtime context functions
    if (runtimeContext) {
      await injectRuntimeFunctions(jail, context, runtimeContext);
    }

    // Wrap the code based on its format
    const wrappedCode = wrapCode(code);

    // Compile and run the script
    const script = await isolate.compileScript(wrappedCode);
    const result: unknown = await script.run(context, {
      timeout: opts.timeout,
      copy: true, // Ensure objects are copied back to the main context
    });

    return {
      success: true,
      value: result,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Script execution failed';

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    // Clean up the isolate to free memory
    if (isolate) {
      isolate.dispose();
    }
  }
}

/**
 * Wrap an async function to return ExternalCopy for isolate transfer.
 * This is necessary because applySyncPromise requires transferable results.
 * Errors are re-thrown with their original message preserved.
 */
function wrapForIsolate<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<ivm.Copy<R>> {
  return async (...args: T): Promise<ivm.Copy<R>> => {
    try {
      const result = await fn(...args);
      return new ivm.ExternalCopy(result).copyInto();
    } catch (error) {
      // Re-throw with the original error message so it propagates to the isolate
      const message =
        error instanceof Error ? error.message : 'Function execution failed';
      throw new Error(message);
    }
  };
}

/**
 * Inject runtime functions into the isolate's global context.
 * Uses ivm.Reference with applySyncPromise for async function calls.
 * Results are wrapped with ExternalCopy for proper transfer across isolate boundary.
 */
async function injectRuntimeFunctions(
  jail: ivm.Reference<Record<string | number | symbol, unknown>>,
  context: ivm.Context,
  runtimeContext: RuntimeContext,
): Promise<void> {
  // Inject getFormField
  if (runtimeContext.getFormField) {
    const wrappedFn = wrapForIsolate(runtimeContext.getFormField);
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_getFormFieldRef', ref);
    await context.eval(`
      globalThis.getFormField = function(fieldId) {
        return _getFormFieldRef.applySyncPromise(undefined, [fieldId]);
      };
    `);
  }

  // Inject getApplicantProfile
  if (runtimeContext.getApplicantProfile) {
    const wrappedFn = wrapForIsolate(runtimeContext.getApplicantProfile);
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_getApplicantProfileRef', ref);
    await context.eval(`
      globalThis.getApplicantProfile = function() {
        return _getApplicantProfileRef.applySyncPromise(undefined, []);
      };
    `);
  }

  // Inject getApplication
  if (runtimeContext.getApplication) {
    const wrappedFn = wrapForIsolate(runtimeContext.getApplication);
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_getApplicationRef', ref);
    await context.eval(`
      globalThis.getApplication = function() {
        return _getApplicationRef.applySyncPromise(undefined, []);
      };
    `);
  }

  // Inject getMasterData
  // Options object must be serialized to JSON to cross the isolate boundary,
  // since isolated-vm cannot transfer complex objects directly.
  if (runtimeContext.getMasterData) {
    const wrappedFn = wrapForIsolate((name: string, optionsJson?: string) => {
      const options = optionsJson
        ? (JSON.parse(optionsJson) as Record<string, unknown>)
        : undefined;
      return runtimeContext.getMasterData!(name, options);
    });
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_getMasterDataRef', ref);
    await context.eval(`
      globalThis.getMasterData = function(name, options) {
        var optionsJson = options ? JSON.stringify(options) : undefined;
        return _getMasterDataRef.applySyncPromise(undefined, [name, optionsJson]);
      };
    `);
  }

  // Inject getCurrentNode
  if (runtimeContext.getCurrentNode) {
    const wrappedFn = wrapForIsolate(runtimeContext.getCurrentNode);
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_getCurrentNodeRef', ref);
    await context.eval(`
      globalThis.getCurrentNode = function() {
        return _getCurrentNodeRef.applySyncPromise(undefined, []);
      };
    `);
  }

  // Inject fetch
  // Options and response are serialized to JSON to cross the isolate boundary.
  // The response is wrapped with .json() and .text() methods inside the isolate.
  if (runtimeContext.fetch) {
    const wrappedFn = wrapForIsolate((url: string, optionsJson?: string) => {
      const options = optionsJson
        ? (JSON.parse(optionsJson) as Record<string, unknown>)
        : undefined;
      return runtimeContext.fetch!(url, options);
    });
    const ref = new ivm.Reference(wrappedFn);
    await jail.set('_fetchRef', ref);
    await context.eval(`
      globalThis.fetch = function(url, options) {
        var optionsJson = options ? JSON.stringify(options) : undefined;
        var raw = _fetchRef.applySyncPromise(undefined, [url, optionsJson]);
        return {
          status: raw.status,
          statusText: raw.statusText,
          ok: raw.ok,
          headers: raw.headers,
          body: raw.body,
          json: function() { return JSON.parse(raw.body); },
          text: function() { return raw.body; }
        };
      };
    `);
  }

  // Inject alert for debugging (logs to console)
  const alertRef = new ivm.Reference((msg: unknown) => {
    console.log('[Script Alert]', msg);
    return Promise.resolve();
  });
  await jail.set('_alertRef', alertRef);
  await context.eval(`
    globalThis.alert = function(msg) {
      var str = typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : String(msg);
      _alertRef.applyIgnored(undefined, [str]);
    };
  `);
}
