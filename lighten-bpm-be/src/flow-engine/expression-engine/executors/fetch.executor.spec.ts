/**
 * Unit Tests - FetchExecutor
 */

import { lookup } from 'dns/promises';
import { FetchExecutor } from './fetch.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError } from '../../types';

// Mock dns/promises
jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLookup = lookup as jest.MockedFunction<typeof lookup>;

describe('FetchExecutor', () => {
  let executor: FetchExecutor;
  const context: ExecutionContext = {};

  beforeEach(() => {
    executor = new FetchExecutor();
    jest.clearAllMocks();

    // Default: resolve to a public IP
    mockLookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
  });

  // ===========================================================================
  // Success cases
  // ===========================================================================

  describe('Success cases', () => {
    it('should return response object when GET request succeeds', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"name":"test"}'),
      });

      // Act
      const result = await executor.execute(
        ['https://api.example.com/data'],
        context,
      );

      // Assert
      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: { 'content-type': 'application/json' },
        body: '{"name":"test"}',
      });
    });

    it('should send POST request with body when method is POST', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 201,
        statusText: 'Created',
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"id":1}'),
      });
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"test"}',
      };

      // Act
      const result = await executor.execute(
        ['https://api.example.com/items', options],
        context,
      );

      // Assert
      expect(result.status).toBe(201);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"test"}',
        signal: expect.any(AbortSignal) as AbortSignal,
      });
    });

    it('should send PUT request when method is PUT', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('{"updated":true}'),
      });

      // Act
      const result = await executor.execute(
        ['https://api.example.com/items/1', { method: 'PUT', body: '{}' }],
        context,
      );

      // Assert
      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('should send DELETE request when method is DELETE', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 204,
        statusText: 'No Content',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve(''),
      });

      // Act
      const result = await executor.execute(
        ['https://api.example.com/items/1', { method: 'DELETE' }],
        context,
      );

      // Assert
      expect(result.status).toBe(204);
    });

    it('should default to GET when no method specified', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve(''),
      });

      // Act
      await executor.execute(['https://api.example.com/data'], context);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should not send body when method is GET', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve(''),
      });

      // Act
      await executor.execute(
        ['https://api.example.com/data', { method: 'GET', body: 'ignored' }],
        context,
      );

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ body: undefined }),
      );
    });
  });

  // ===========================================================================
  // Argument validation
  // ===========================================================================

  describe('Argument validation', () => {
    it('should throw error when no arguments provided', async () => {
      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'fetch() expects 1-2 arguments (url, options?), got 0',
      );
    });

    it('should throw error when more than 2 arguments provided', async () => {
      // Act & Assert
      await expect(
        executor.execute(['url', {}, 'extra'], context),
      ).rejects.toThrow('fetch() expects 1-2 arguments (url, options?), got 3');
    });

    it('should throw error when URL is not a string', async () => {
      // Act & Assert
      await expect(executor.execute([123], context)).rejects.toThrow(
        'fetch() requires a non-empty string URL',
      );
    });

    it('should throw error when URL is empty string', async () => {
      // Act & Assert
      await expect(executor.execute([''], context)).rejects.toThrow(
        'fetch() requires a non-empty string URL',
      );
    });

    it('should throw error when URL format is invalid', async () => {
      // Act & Assert
      await expect(executor.execute(['not-a-url'], context)).rejects.toThrow(
        'fetch() received an invalid URL: not-a-url',
      );
    });

    it('should throw error when protocol is not http/https', async () => {
      // Act & Assert
      await expect(
        executor.execute(['ftp://example.com/file'], context),
      ).rejects.toThrow('fetch() only supports http/https protocols');
    });

    it('should throw error when method is not allowed', async () => {
      // Act & Assert
      await expect(
        executor.execute(
          ['https://api.example.com', { method: 'PATCH' }],
          context,
        ),
      ).rejects.toThrow(
        'fetch() unsupported method: PATCH. Allowed: GET, POST, PUT, DELETE',
      );
    });
  });

  // ===========================================================================
  // SSRF protection
  // ===========================================================================

  describe('SSRF protection', () => {
    it('should throw error when hostname is localhost', async () => {
      // Act & Assert
      await expect(
        executor.execute(['http://localhost:3000/api'], context),
      ).rejects.toThrow('fetch() cannot access localhost or private addresses');
    });

    it('should throw error when hostname is 0.0.0.0', async () => {
      // Act & Assert
      await expect(
        executor.execute(['http://0.0.0.0:3000/api'], context),
      ).rejects.toThrow('fetch() cannot access localhost or private addresses');
    });

    it('should throw error when IP resolves to 127.0.0.1', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '127.0.0.1', family: 4 });

      // Act & Assert
      await expect(
        executor.execute(['https://sneaky.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when IP resolves to 10.x.x.x', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '10.0.0.1', family: 4 });

      // Act & Assert
      await expect(
        executor.execute(['https://internal.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when IP resolves to 172.16.x.x', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '172.16.0.1', family: 4 });

      // Act & Assert
      await expect(
        executor.execute(['https://internal.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when IP resolves to 192.168.x.x', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '192.168.1.1', family: 4 });

      // Act & Assert
      await expect(
        executor.execute(['https://internal.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when IP resolves to 169.254.x.x (link-local)', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '169.254.1.1', family: 4 });

      // Act & Assert
      await expect(
        executor.execute(['https://internal.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when IP resolves to IPv6 loopback', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '::1', family: 6 });

      // Act & Assert
      await expect(
        executor.execute(['https://internal.example.com/api'], context),
      ).rejects.toThrow('fetch() cannot access private/internal addresses');
    });

    it('should throw error when DNS resolution fails', async () => {
      // Arrange
      mockLookup.mockRejectedValueOnce(new Error('ENOTFOUND'));

      // Act & Assert
      await expect(
        executor.execute(['https://nonexistent.example.com/api'], context),
      ).rejects.toThrow('fetch() DNS resolution failed');
    });

    it('should allow public IP addresses', async () => {
      // Arrange
      mockLookup.mockResolvedValueOnce({ address: '93.184.216.34', family: 4 });
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('ok'),
      });

      // Act
      const result = await executor.execute(
        ['https://example.com/api'],
        context,
      );

      // Assert
      expect(result.status).toBe(200);
    });
  });

  // ===========================================================================
  // Error handling
  // ===========================================================================

  describe('Error handling', () => {
    it('should throw error when network request fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(
        executor.execute(['https://api.example.com/data'], context),
      ).rejects.toThrow(
        'fetch() failed for "https://api.example.com/data": Network error',
      );
    });

    it('should throw error when request times out', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

      // Act & Assert
      await expect(
        executor.execute(['https://slow.example.com/api'], context),
      ).rejects.toThrow('fetch() failed for "https://slow.example.com/api"');
    });

    it('should throw error when response body exceeds size limit', async () => {
      // Arrange
      const largeBody = 'x'.repeat(5 * 1024 * 1024 + 1);
      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve(largeBody),
      });

      // Act & Assert
      await expect(
        executor.execute(['https://api.example.com/large'], context),
      ).rejects.toThrow('fetch() response body exceeds maximum size');
    });
  });
});
