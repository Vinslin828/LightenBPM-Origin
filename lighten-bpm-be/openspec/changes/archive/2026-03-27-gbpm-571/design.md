# Design: Refactor Application Visibility (GBPM-571)

## Data Transfer Objects (DTOs)

### 1. `ListApplicationsQueryDto` updates
Update `src/instance/dto/list-applications-query.dto.ts`:
```typescript
export enum ApplicationsFilterEnum {
  SUBMITTED = 'submitted',
  APPROVING = 'approving',
  VISIBLE = 'visible', // New filter type
}

export class ListApplicationsQueryDto extends PaginationQueryDto {
  @IsEnum(ApplicationsFilterEnum)
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  filter?: ApplicationsFilterEnum = ApplicationsFilterEnum.SUBMITTED;

  // New Search Fields
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  applicantId?: number;

  // Existing Fields
  @IsEnum(InstanceStatus)
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  overallStatus?: InstanceStatus;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  approvalStatus?: ApprovalStatus;

  @IsString()
  @IsOptional()
  formName?: string;

  @IsString()
  @IsOptional()
  workflowName?: string;

  @IsEnum(ApplicationSortByEnum)
  @IsOptional()
  sortBy?: ApplicationSortByEnum = ApplicationSortByEnum.CREATED_AT;

  @IsEnum(SortOrderEnum)
  @IsOptional()
  sortOrder?: SortOrderEnum = SortOrderEnum.DESC;
}
```

## Service Changes (`ApplicationService`)

### 1. `listApplications`
Refactor logic:
```typescript
  async listApplications(
    user: AuthUser,
    query: ListApplicationsQueryDto,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    let visibilityWhere: Prisma.WorkflowInstanceWhereInput;

    if (query.filter === ApplicationsFilterEnum.VISIBLE) {
      // All viewable applications
      visibilityWhere = this.permissionBuilder.getInstanceVisibilityWhere(user);
    } else if (query.filter === ApplicationsFilterEnum.APPROVING) {
      // Personal inbox: Approving applications
      // The repository method 'listApprovingApplicationInstances' already filters by assignee_id = user.id
      // So visibilityWhere can be empty or restricted.
      return this.applicationRepository.listApprovingApplicationInstances(
        user.id,
        query,
      );
    } else {
      // Personal sent box: filter=submitted (default)
      visibilityWhere = { applicant_id: user.id };
    }

    return this.applicationRepository.listSubmittedApplicationInstances(
      user.id,
      query,
      visibilityWhere,
    );
  }
```

## Repository Changes (`ApplicationRepository`)

### 1. `listSubmittedApplicationInstances`
Update to handle the new `serialNumber` and `applicantId` filters:
```typescript
  async listSubmittedApplicationInstances(
    userId: number,
    query: ListApplicationsQueryDto,
    visibilityWhere?: Prisma.WorkflowInstanceWhereInput,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    const where: Prisma.WorkflowInstanceWhereInput = {
      AND: [
        visibilityWhere || {},
        {
          serial_number: query.serialNumber ? { contains: query.serialNumber, mode: 'insensitive' } : undefined,
          applicant_id: query.applicantId,
          status: query.overallStatus,
          // ... rest of filters (formName, workflowName)
        },
      ],
    };
    // ... rest of implementation
  }
```

## Detailed Visibility for `VISIBLE`
When `filter=visible`, `visibilityWhere` should be:
*   Applicant OR Shared OR Involved (as defined in `PermissionBuilderService.getInstanceVisibilityWhere`).
