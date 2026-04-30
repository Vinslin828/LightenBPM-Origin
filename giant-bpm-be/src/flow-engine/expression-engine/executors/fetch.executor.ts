/**
 * Fetch Executor
 *
 * Executes the fetch() function within the expression engine.
 * Makes HTTP requests to external APIs with SSRF protection.
 *
 * @example
 * // GET request
 * fetch("https://api.example.com/users").json()
 *
 * // POST request
 * fetch("https://api.example.com/items", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ name: "test" })
 * }).json()
 *
 * // Check status
 * fetch("https://api.example.com/health").ok
 */

import { Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';

/** Timeout for individual HTTP requests (ms) */
const FETCH_TIMEOUT_MS = 5000;

/** Maximum response body size (5MB) */
const MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed HTTP methods */
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
}

/**
 * Check if an IP address is private/internal (SSRF protection)
 */
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '::') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ipv4 = v4Mapped ? v4Mapped[1] : ip;

  const parts = ipv4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) {
    // Not a valid IPv4 — treat as potentially private for safety
    return true;
  }

  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 0.0.0.0
  if (parts[0] === 0) return true;

  // 169.254.0.0/16 (link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}

@Injectable()
export class FetchExecutor implements FunctionExecutor {
  /**
   * Execute fetch(url, options?)
   *
   * @param args - [url, options?] - URL string and optional fetch options
   * @param context - Execution context (not used but required by interface)
   * @returns Response object with status, headers, and body
   */
  async execute(
    args: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ExecutionContext,
  ): Promise<FetchResponse> {
    // Validate arguments
    if (args.length < 1 || args.length > 2) {
      throw new FlowExecutionError(
        `fetch() expects 1-2 arguments (url, options?), got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    const url = args[0];
    if (!url || typeof url !== 'string') {
      throw new FlowExecutionError(
        'fetch() requires a non-empty string URL',
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new FlowExecutionError(
        `fetch() received an invalid URL: ${url}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Only allow http/https protocols
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new FlowExecutionError(
        'fetch() only supports http/https protocols',
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // SSRF protection: check hostname
    const hostname = parsedUrl.hostname;

    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      throw new FlowExecutionError(
        'fetch() cannot access localhost or private addresses',
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Resolve DNS and check for private IPs
    try {
      const { address } = await lookup(hostname);
      if (isPrivateIp(address)) {
        throw new FlowExecutionError(
          'fetch() cannot access private/internal addresses',
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }
    } catch (error) {
      if (error instanceof FlowExecutionError) throw error;
      throw new FlowExecutionError(
        `fetch() DNS resolution failed for "${hostname}"`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Parse options
    const options = (args[1] as FetchOptions) || {};
    const method = (options.method || 'GET').toUpperCase();

    if (!ALLOWED_METHODS.includes(method)) {
      throw new FlowExecutionError(
        `fetch() unsupported method: ${method}. Allowed: ${ALLOWED_METHODS.join(', ')}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    try {
      const response = await fetch(url, {
        method,
        headers: options.headers,
        body: method !== 'GET' ? options.body : undefined,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      // Read body as text and enforce size limit
      const body = await response.text();
      if (body.length > MAX_RESPONSE_SIZE_BYTES) {
        throw new FlowExecutionError(
          `fetch() response body exceeds maximum size of ${MAX_RESPONSE_SIZE_BYTES} bytes`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }

      // Extract headers as plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers,
        body,
      };
    } catch (error) {
      if (error instanceof FlowExecutionError) throw error;

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new FlowExecutionError(
        `fetch() failed for "${url}": ${message}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }
  }
}
