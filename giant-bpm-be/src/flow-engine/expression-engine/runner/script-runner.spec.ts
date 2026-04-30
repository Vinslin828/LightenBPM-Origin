/**
 * Unit Tests - Script Runner
 */

import { runScript, RuntimeContext } from './script-runner';

describe('ScriptRunner', () => {
  describe('Inline expressions', () => {
    it('should evaluate arithmetic expressions', async () => {
      const result = await runScript('5 + 3');
      expect(result.success).toBe(true);
      expect(result.value).toBe(8);
    });

    it('should evaluate comparison expressions', async () => {
      const result = await runScript('10 > 5');
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should evaluate logical expressions with &&', async () => {
      const result = await runScript('true && false');
      expect(result.success).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should evaluate logical expressions with ||', async () => {
      const result = await runScript('true || false');
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should evaluate ternary expressions', async () => {
      const result = await runScript('10 > 5 ? "yes" : "no"');
      expect(result.success).toBe(true);
      expect(result.value).toBe('yes');
    });

    it('should evaluate string concatenation with +', async () => {
      const result = await runScript('"hello" + " " + "world"');
      expect(result.success).toBe(true);
      expect(result.value).toBe('hello world');
    });

    it('should evaluate complex expressions', async () => {
      const result = await runScript(
        '(10 + 20) * 2 > 50 && "test".length === 4',
      );
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });
  });

  describe('Function-style code with statements', () => {
    it('should execute code with const declaration', async () => {
      const result = await runScript(`
        const a = 10;
        const b = 20;
        return a + b;
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(30);
    });

    it('should execute code with if-else', async () => {
      const result = await runScript(`
        const value = 100;
        if (value > 50) {
          return "high";
        } else {
          return "low";
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe('high');
    });

    it('should execute code with multiple conditions', async () => {
      const result = await runScript(`
        const total = 30 + 40 + 50;
        if (total > 100000) {
          return false;
        } else if (total < 500) {
          return false;
        }
        return true;
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(false); // 120 < 500
    });

    it('should execute code with loops', async () => {
      const result = await runScript(`
        let sum = 0;
        for (let i = 1; i <= 5; i++) {
          sum += i;
        }
        return sum;
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(15);
    });

    it('should execute statements without return when code has variable declarations', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getCurrentNode: () =>
          Promise.resolve({
            nodeKey: 'approval_1',
            approverId: { current: [201], prev: null, next: null },
          }),
      };

      // Act
      const result = await runScript(
        'const a = getCurrentNode().nodeKey; alert(a);',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it('should execute statements without return when code has semicolons', async () => {
      // Act
      const result = await runScript('1 + 2; 3 + 4;');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('Function definition format', () => {
    it('should execute named function and return result', async () => {
      const result = await runScript(`
        function condition() {
          return 10 > 5;
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should execute function with complex logic', async () => {
      const result = await runScript(`
        function condition() {
          const a = 10;
          const b = 20;
          return a + b > 25;
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should execute function with nested helper function', async () => {
      const result = await runScript(`
        function condition() {
          function helper(x) {
            return x > 100;
          }
          return helper(150);
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should work with any function name', async () => {
      const result = await runScript(`
        function myCustomValidator() {
          return "hello" === "hello";
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should execute function with leading single-line comment', async () => {
      const result = await runScript(`
        // this is a comment
        function expression() {
          return 42;
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should execute function with multiple leading single-line comments', async () => {
      const result = await runScript(`
        // comment line 1
        // comment line 2
        function expression() {
          return 100;
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });

    it('should execute function with leading multi-line comment', async () => {
      const result = await runScript(`
        /* this is a
           multi-line comment */
        function expression() {
          return "ok";
        }
      `);
      expect(result.success).toBe(true);
      expect(result.value).toBe('ok');
    });

    it('should execute function with leading comment and runtime context', async () => {
      const runtimeContext: RuntimeContext = {
        getFormField: (fieldId: string) => {
          const data: Record<string, unknown> = {
            grid_field: '[{"qty":2,"price":20},{"qty":3,"price":30}]',
          };
          return Promise.resolve({ value: data[fieldId] });
        },
      };

      const result = await runScript(
        `// sum quantities
        function expression() {
          const raw = getFormField("grid_field").value;
          const rows = typeof raw === "string" ? JSON.parse(raw) : [];
          return rows.reduce((sum, row) => sum + row.qty, 0);
        }`,
        runtimeContext,
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should return error for syntax errors', async () => {
      const result = await runScript('const x = ;');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for undefined variables', async () => {
      const result = await runScript('undefinedVariable + 1');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should timeout for infinite loops', async () => {
      const result = await runScript('while(true) {}', undefined, {
        timeout: 100,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should not have access to require', async () => {
      const result = await runScript('require("fs")');
      expect(result.success).toBe(false);
    });

    it('should not have access to process', async () => {
      const result = await runScript('process.env');
      expect(result.success).toBe(false);
    });

    it('should not have access to global Node.js objects', async () => {
      const result = await runScript('Buffer.from("test")');
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Runtime Context Injection
  // ===========================================================================

  describe('Runtime context injection', () => {
    it('should return field value when getFormField is called with string literal', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getFormField: () => Promise.resolve({ value: 5000 }),
      };

      // Act
      const result = await runScript(
        'getFormField("amount").value',
        runtimeContext,
      );

      // Assert
      if (!result.success) {
        console.log('Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.value).toBe(5000);
    });

    it('should return field value when getFormField is called with dynamic variable', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getFormField: () => Promise.resolve({ value: 'John' }),
      };

      // Act
      const result = await runScript(
        `
        const fieldName = "name";
        return getFormField(fieldName).value;
        `,
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
    });

    it('should return sum when getFormField is called in a loop', async () => {
      // Arrange
      let callCount = 0;
      const values = [10, 20, 30];
      const runtimeContext: RuntimeContext = {
        getFormField: () => Promise.resolve({ value: values[callCount++] }),
      };

      // Act
      const result = await runScript(
        `
        const fields = ["a", "b", "c"];
        let sum = 0;
        for (const f of fields) {
          sum += getFormField(f).value;
        }
        return sum;
        `,
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe(60);
    });

    it('should return matched item when getMasterData is called with array methods', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getMasterData: () =>
          Promise.resolve([
            { id: 1, name: 'A', score: 100 },
            { id: 2, name: 'B', score: 80 },
          ]),
      };

      // Act
      const result = await runScript(
        'getMasterData("TEST").find(v => v.score > 90).name',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('A');
    });

    it('should pass options to getMasterData when provided', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getMasterData: jest
          .fn()
          .mockResolvedValue([{ id: 1, name: 'Filtered', score: 95 }]),
      };

      // Act
      const result = await runScript(
        'getMasterData("VENDORS", { filter: { status: "active" }, sort: { field: "score", order: "desc" } })',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toEqual([{ id: 1, name: 'Filtered', score: 95 }]);
      expect(runtimeContext.getMasterData).toHaveBeenCalledWith('VENDORS', {
        filter: { status: 'active' },
        sort: { field: 'score', order: 'desc' },
      });
    });

    it('should return node property when getCurrentNode is called', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getCurrentNode: () =>
          Promise.resolve({
            nodeKey: 'approval_1',
            approverId: {
              current: [202],
              prev: [201],
              next: [203],
            },
          }),
      };

      // Act
      const result = await runScript(
        'getCurrentNode().nodeKey',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('approval_1');
    });

    it('should return profile property when getApplicantProfile is called', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        getApplicantProfile: () =>
          Promise.resolve({ name: '張三', department: 'IT' }),
      };

      // Act
      const result = await runScript(
        'getApplicantProfile().name',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('張三');
    });
  });

  // ===========================================================================
  // Fetch injection
  // ===========================================================================

  describe('Fetch injection', () => {
    const mockFetchResponse = (
      overrides: Partial<{
        status: number;
        statusText: string;
        ok: boolean;
        headers: Record<string, string>;
        body: string;
      }> = {},
    ) => ({
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: { 'content-type': 'application/json' },
      body: '{}',
      ...overrides,
    });

    it('should return parsed JSON when .json() is called', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(
            mockFetchResponse({ body: '{"name":"test","value":42}' }),
          ),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/data").json()',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should return raw text when .text() is called', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(mockFetchResponse({ body: 'hello world' })),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/text").text()',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('hello world');
    });

    it('should return status code when .status is accessed', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(mockFetchResponse({ status: 404, ok: false })),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/missing").status',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe(404);
    });

    it('should return false when .ok is accessed on error response', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(mockFetchResponse({ ok: false, status: 500 })),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/error").ok',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should pass options when fetch is called with method and body', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: jest
          .fn()
          .mockResolvedValue(mockFetchResponse({ body: '{"id":1}' })),
      };

      // Act
      const result = await runScript(
        `fetch("https://api.example.com/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "test" })
        }).json()`,
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ id: 1 });
      expect(runtimeContext.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"name":"test"}',
        },
      );
    });

    it('should return nested JSON property when chained with .json()', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(
            mockFetchResponse({
              body: '{"data":{"users":[{"name":"Alice"}]}}',
            }),
          ),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/data").json().data.users[0].name',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe('Alice');
    });

    it('should return error when fetch rejects', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () => Promise.reject(new Error('Network error')),
      };

      // Act
      const result = await runScript(
        'fetch("https://api.example.com/data").json()',
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should work with fetch in complex validation expression', async () => {
      // Arrange
      const runtimeContext: RuntimeContext = {
        fetch: () =>
          Promise.resolve(
            mockFetchResponse({
              body: '{"isValid":true,"maxAmount":50000}',
            }),
          ),
        getFormField: () => Promise.resolve({ value: 30000 }),
      };

      // Act
      const result = await runScript(
        `
        const rules = fetch("https://api.example.com/rules").json();
        const amount = getFormField("amount").value;
        return rules.isValid && amount <= rules.maxAmount;
        `,
        runtimeContext,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });
  });
});
