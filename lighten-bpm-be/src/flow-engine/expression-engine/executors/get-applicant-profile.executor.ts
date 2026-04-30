/**
 * GetApplicantProfile Executor
 *
 * Executes the getApplicantProfile() function
 * Returns the applicant's profile data
 */

import { Injectable } from '@nestjs/common';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { UserService } from '../../../user/user.service';
import { keysToCamelCase } from '../utils/case-converter';

@Injectable()
export class GetApplicantProfileExecutor implements FunctionExecutor {
  constructor(private readonly userService: UserService) {}

  /**
   * Execute getApplicantProfile()
   *
   * @param args - No arguments expected
   * @param context - Must contain applicantId
   * @returns Applicant profile object
   */
  async execute(args: string[], context: ExecutionContext): Promise<any> {
    // Validate arguments
    if (args.length !== 0) {
      throw new FlowExecutionError(
        `getApplicantProfile() expects no arguments, got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Validate context
    if (context.applicantId === undefined) {
      throw new FlowExecutionError(
        `applicantId is required in execution context for getApplicantProfile()`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Fetch applicant profile from user service
    try {
      const applicantProfile = await this.userService.findOne(
        context.applicantId,
      );

      if (!applicantProfile) {
        throw new FlowExecutionError(
          `Applicant with ID ${context.applicantId} not found`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }

      // Convert snake_case keys to camelCase for expression access
      const profile = keysToCamelCase(applicantProfile) as Record<
        string,
        unknown
      >;

      // Add convenience properties for default org
      const resolvedDefaultOrg = profile.resolvedDefaultOrg as
        | Record<string, unknown>
        | undefined;
      profile.defaultOrgName = resolvedDefaultOrg?.name ?? null;
      profile.defaultOrgCode = resolvedDefaultOrg?.code ?? null;
      profile.defaultOrgId = resolvedDefaultOrg?.id ?? null;

      return profile;
    } catch (error) {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      throw new FlowExecutionError(
        `Failed to fetch applicant profile: ${(error as Error).message}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }
  }
}
