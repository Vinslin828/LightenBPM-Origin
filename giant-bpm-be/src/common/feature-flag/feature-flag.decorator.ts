import { SetMetadata } from '@nestjs/common';
import type { FeatureFlagService } from './feature-flag.service';

export const FEATURE_FLAG_KEY = 'featureFlag';

export const RequireFeature = (
  key: keyof FeatureFlagService,
): MethodDecorator => SetMetadata(FEATURE_FLAG_KEY, key);
