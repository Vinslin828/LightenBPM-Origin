import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagService {
  constructor(private config: ConfigService) {}

  get orgUnitWriteEnabled(): boolean {
    return (
      this.config.get<string>('FEATURE_ORG_UNIT_WRITE_ENABLED', 'false') ===
      'true'
    );
  }

  get orgMembershipWriteEnabled(): boolean {
    return (
      this.config.get<string>(
        'FEATURE_ORG_MEMBERSHIP_WRITE_ENABLED',
        'false',
      ) === 'true'
    );
  }

  get hardDeleteEnabled(): boolean {
    return (
      this.config.get<string>('FEATURE_HARD_DELETE_ENABLED', 'false') === 'true'
    );
  }

  get userWriteEnabled(): boolean {
    return (
      this.config.get<string>('FEATURE_USER_WRITE_ENABLED', 'false') === 'true'
    );
  }
}
