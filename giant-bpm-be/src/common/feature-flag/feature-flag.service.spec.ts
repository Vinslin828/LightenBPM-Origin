import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from './feature-flag.service';

const createService = (envMap: Record<string, string>): FeatureFlagService => {
  const config = {
    get: <T>(key: string, defaultValue?: T): T =>
      (envMap[key] ?? defaultValue) as T,
  } as ConfigService;
  return new FeatureFlagService(config);
};

describe('FeatureFlagService', () => {
  describe('orgUnitWriteEnabled', () => {
    it('returns true when env var is "true"', () => {
      expect(
        createService({ FEATURE_ORG_UNIT_WRITE_ENABLED: 'true' })
          .orgUnitWriteEnabled,
      ).toBe(true);
    });

    it('returns false when env var is "false"', () => {
      expect(
        createService({ FEATURE_ORG_UNIT_WRITE_ENABLED: 'false' })
          .orgUnitWriteEnabled,
      ).toBe(false);
    });

    it('defaults to false when env var is absent', () => {
      expect(createService({}).orgUnitWriteEnabled).toBe(false);
    });
  });

  describe('orgMembershipWriteEnabled', () => {
    it('returns true when env var is "true"', () => {
      expect(
        createService({ FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED: 'true' })
          .orgMembershipWriteEnabled,
      ).toBe(true);
    });

    it('returns false when env var is "false"', () => {
      expect(
        createService({ FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED: 'false' })
          .orgMembershipWriteEnabled,
      ).toBe(false);
    });

    it('defaults to false when env var is absent', () => {
      expect(createService({}).orgMembershipWriteEnabled).toBe(false);
    });
  });

  describe('hardDeleteEnabled', () => {
    it('returns true when env var is "true"', () => {
      expect(
        createService({ FEATURE_HARD_DELETE_ENABLED: 'true' })
          .hardDeleteEnabled,
      ).toBe(true);
    });

    it('returns false when env var is "false"', () => {
      expect(
        createService({ FEATURE_HARD_DELETE_ENABLED: 'false' })
          .hardDeleteEnabled,
      ).toBe(false);
    });

    it('defaults to false when env var is absent', () => {
      expect(createService({}).hardDeleteEnabled).toBe(false);
    });
  });
});
