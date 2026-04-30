import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard } from './feature-flag.guard';
import { FeatureFlagService } from './feature-flag.service';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';

const mockHandler = jest.fn();

const createContext = (): ExecutionContext =>
  ({ getHandler: () => mockHandler }) as unknown as ExecutionContext;

describe('FeatureFlagGuard', () => {
  let guard: FeatureFlagGuard;
  let reflector: jest.Mocked<Reflector>;
  let featureFlags: jest.Mocked<FeatureFlagService>;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    featureFlags = {
      orgUnitWriteEnabled: true,
      orgMembershipWriteEnabled: true,
    } as unknown as jest.Mocked<FeatureFlagService>;
    guard = new FeatureFlagGuard(reflector, featureFlags);
  });

  it('passes when no feature key is set on the handler', () => {
    reflector.get.mockReturnValue(undefined);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('passes when the referenced feature flag is enabled', () => {
    reflector.get.mockReturnValue('orgUnitWriteEnabled');
    Object.defineProperty(featureFlags, 'orgUnitWriteEnabled', {
      get: () => true,
    });
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws ForbiddenException when the feature flag is disabled', () => {
    reflector.get.mockReturnValue('orgUnitWriteEnabled');
    Object.defineProperty(featureFlags, 'orgUnitWriteEnabled', {
      get: () => false,
    });
    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('uses the correct metadata key when reading from reflector', () => {
    reflector.get.mockReturnValue(undefined);
    guard.canActivate(createContext());
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reflector.get).toHaveBeenCalledWith(FEATURE_FLAG_KEY, mockHandler);
  });

  it('throws with the expected message when disabled', () => {
    reflector.get.mockReturnValue('orgMembershipWriteEnabled');
    Object.defineProperty(featureFlags, 'orgMembershipWriteEnabled', {
      get: () => false,
    });
    expect(() => guard.canActivate(createContext())).toThrow(
      'This operation is currently disabled by system configuration',
    );
  });
});
