import { Test, TestingModule } from '@nestjs/testing';
import { ScriptExecutionService } from './script-execution.service';
import { BadRequestException, RequestTimeoutException } from '@nestjs/common';

describe('ScriptExecutionService', () => {
  let service: ScriptExecutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScriptExecutionService],
    }).compile();

    service = module.get<ScriptExecutionService>(ScriptExecutionService);

    // Mock global fetch
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should execute a simple script and return the result', async () => {
    const functionBody = 'return 1 + 1;';
    const result = await service.executeFetch(functionBody);
    expect(result).toBe(2);
  });

  it('should execute an async script with fetch', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve('{"data": "test"}'),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const functionBody = `
      const res = await fetch('https://api.example.com');
      const json = await res.json();
      return json.data;
    `;

    const result = await service.executeFetch(functionBody);
    expect(result).toBe('test');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com',
      undefined,
    );
  });

  it('should throw RequestTimeoutException on timeout', async () => {
    // Force a timeout by using a script that takes too long
    // Note: isolated-vm timeout is quite strict.
    const functionBody = 'while(true) {}';

    // We need to lower the timeout for the test to run quickly
    // But since it's private and hardcoded, we'll just wait for the 5s or mock the service property if possible.
    // For now, I'll trust the 5s timeout or try a slightly shorter one if I can inject it.

    // Actually, I can use a simpler way to trigger timeout in some environments,
    // but while(true) is the most reliable for isolated-vm.

    await expect(service.executeFetch(functionBody)).rejects.toThrow(
      RequestTimeoutException,
    );
  }, 10000); // Give it 10s total for the 5s timeout

  it('should throw BadRequestException on syntax error', async () => {
    const functionBody = 'const x = ;';
    await expect(service.executeFetch(functionBody)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on restricted access (process)', async () => {
    const functionBody = 'return process.env;';
    await expect(service.executeFetch(functionBody)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on restricted access (require)', async () => {
    const functionBody = 'return require("fs");';
    await expect(service.executeFetch(functionBody)).rejects.toThrow(
      BadRequestException,
    );
  });
});
