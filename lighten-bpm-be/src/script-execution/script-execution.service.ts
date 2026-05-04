import {
  Injectable,
  Logger,
  BadRequestException,
  RequestTimeoutException,
} from '@nestjs/common';
import ivm from 'isolated-vm';
import { CallExternalApiDto } from './dto/request/call-external-api.dto';

export interface ScriptRunResult {
  success: boolean;
  value?: unknown;
  error?: string;
  statusCode?: number;
}

@Injectable()
export class ScriptExecutionService {
  private readonly logger = new Logger(ScriptExecutionService.name);

  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private readonly DEFAULT_MEMORY_LIMIT = 128; // 128 MB

  /**
   * Run a JavaScript function body in a secure sandbox.
   *
   * @param functionBody - The body of the async function to execute.
   * @returns The result of the execution.
   */
  async executeFetch(functionBody: string): Promise<unknown> {
    const isolate = new ivm.Isolate({ memoryLimit: this.DEFAULT_MEMORY_LIMIT });
    try {
      const context = await isolate.createContext();
      const jail = context.global;

      // Basic global setup
      await jail.set('global', jail.derefInto());

      // Inject fetch bridge
      await this.injectFetch(jail, context);

      // Wrap the function body in an async IIFE
      // This allows 'await' to be used directly in the snippet.
      const wrappedCode = `
        (async function() {
          ${functionBody}
        })()
      `;

      const result = (await context.eval(wrappedCode, {
        timeout: this.DEFAULT_TIMEOUT,
        copy: true,
        promise: true,
      })) as unknown;

      return result;
    } catch (error) {
      this.handleExecutionError(error);
    } finally {
      isolate.dispose();
    }
  }

  private async injectFetch(
    jail: ivm.Reference<Record<string | number | symbol, unknown>>,
    context: ivm.Context,
  ): Promise<void> {
    const fetchRef = new ivm.Reference(
      async (url: string, optionsJson?: string) => {
        const options = optionsJson
          ? (JSON.parse(optionsJson) as Record<string, unknown>)
          : undefined;
        try {
          const response = await fetch(url, options);
          const body = await response.text();
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });

          return new ivm.ExternalCopy({
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers,
            body,
          }).copyInto();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Fetch failed';
          throw new Error(message);
        }
      },
    );

    await jail.set('_fetchRef', fetchRef);
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

  /**
   * Call an external API through the secure sandbox.
   * Supports optional query params, headers and body.
   */
  async callExternalApi(config: CallExternalApiDto): Promise<unknown> {
    const url = this.buildUrlWithParams(config.url, config.params);
    const method = config.method ?? 'GET';

    const optionsParts: string[] = [`method: '${method}'`];

    if (config.headers && Object.keys(config.headers).length > 0) {
      optionsParts.push(`headers: ${JSON.stringify(config.headers)}`);
    }

    if (config.body !== undefined && config.body !== null) {
      const bodyStr =
        typeof config.body === 'string'
          ? config.body
          : JSON.stringify(config.body);
      optionsParts.push(`body: ${JSON.stringify(bodyStr)}`);
    }

    const script = `
      const res = fetch(${JSON.stringify(url)}, { ${optionsParts.join(', ')} });
      if (!res.ok) {
        throw new Error('External API request failed: ' + res.status + ' ' + res.statusText);
      }
      return res.json();
    `;

    return this.executeFetch(script);
  }

  private buildUrlWithParams(
    url: string,
    params?: Record<string, string>,
  ): string {
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams(params).toString();
    return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
  }

  private handleExecutionError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Script execution timed out')) {
      throw new RequestTimeoutException('Script execution timed out');
    }

    // isolated-vm errors often have 'Isolate is disposed' or similar when memory is hit
    if (message.includes('Isolate is disposed')) {
      throw new BadRequestException(
        'Script execution exceeded resource limits',
      );
    }

    throw new BadRequestException(`Script execution failed: ${message}`);
  }
}
