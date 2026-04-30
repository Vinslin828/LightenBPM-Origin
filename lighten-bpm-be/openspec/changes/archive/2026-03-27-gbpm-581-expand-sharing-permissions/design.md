# Design: Expand Instance Sharing Permissions (GBPM-581)

## Data Provider Changes (`InstanceDataService`)

Add `isUserInvolvedAsApprover` to `src/instance/instance-data.service.ts`:
```typescript
  /**
   * Checks if a user is involved as an approver in a specific workflow instance.
   * @param instanceId - The internal ID of the workflow instance
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user is an assignee or escalated_to in any task for this instance
   */
  async isUserInvolvedAsApprover(instanceId: number, userId: number): Promise<boolean> {
    const count = await this.approvalTaskRepository.count({
      workflow_node: {
        instance_id: instanceId,
      },
      OR: [
        { assignee_id: userId },
        { escalated_to: userId },
      ],
    });
    return count > 0;
  }
```

## Service Changes (`ApplicationService`)

Create a private helper method `canManageInstanceShares(instance: WorkflowInstance, user: AuthUser): Promise<void>`:
```typescript
  private async checkCanManageShares(instanceId: number, applicantId: number, user: AuthUser): Promise<void> {
    if (isAdminUser(user)) return;
    if (applicantId === user.id) return;

    const isApprover = await this.instanceDataService.isUserInvolvedAsApprover(instanceId, user.id);
    if (isApprover) return;

    throw new ForbiddenException('Only the applicant, admin, or involved approvers can manage shares for this instance');
  }
```

Update the following methods to use the helper:
- `createInstanceShare`
- `createInstanceShares`
- `setInstanceShares`
- `listInstanceShares`
- `deleteInstanceSharesByQuery`

Example refactor for `createInstanceShare`:
```typescript
  async createInstanceShare(
    serialNumber: string,
    data: CreateInstanceShareDto,
    user: AuthUser,
  ): Promise<InstanceShareDto> {
    const instance = await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(`Instance with serial number ${serialNumber} not found`);
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    return this.instanceShareRepository.create({
      // ...
    });
  }
```

## Testing Plan

### Unit Tests
-   **InstanceDataService**: Test `isUserInvolvedAsApprover` with:
    -   User as assignee (True)
    -   User as escalated_to (True)
    -   User as neither (False)
-   **ApplicationService**: Test sharing methods with:
    -   Admin user (Allowed)
    -   Applicant user (Allowed)
    -   Approver user (Allowed)
    -   Other user (Forbidden)
