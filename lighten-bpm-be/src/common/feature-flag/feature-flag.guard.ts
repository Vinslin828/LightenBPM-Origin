import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlags: FeatureFlagService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.reflector.get<keyof FeatureFlagService>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );
    if (!key) return true;

    const enabled = this.featureFlags[key];
    if (!enabled) {
      throw new ForbiddenException(
        'This operation is currently disabled by system configuration',
      );
    }
    return true;
  }
}
