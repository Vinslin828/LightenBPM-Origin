import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationDto, ApplicationInstanceDto } from '../dto/application.dto';
import { Prisma } from '@prisma/client';
import {
  ApplicationInstance,
  ApprovalStatus,
  RevisionState,
  InstanceStatus,
} from '../../common/types/common.types';
import {
  ListApplicationsQueryDto,
  ApplicationSortByEnum,
} from '../dto/list-applications-query.dto';
import {
  ListAvailableApplicationsQueryDto,
  SortOrderEnum,
} from '../dto/list-available-applications-query.dto';
import { ApplicationNodesDto } from '../dto/application-nodes.dto';
import { WorkflowNodeDto } from '../dto/workflow-node.dto';
import { WorkflowCommentDto } from '../dto/workflow-comment.dto';
import { WorkflowHistoryDto } from '../dto/workflow-history.dto';
import { UserDto } from '../../user/dto/user.dto';
import { toWorkflowRevisionDto } from '../../workflow/dto/workflow-revision.dto';
import { WorkflowInstanceDto } from '../dto/workflow-instance.dto';
import { FlowInstance } from '../../flow-engine/routing-builder/routing-builder';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { JsonObject } from '@prisma/client/runtime/library';
import { userInclude } from '../../user/repository/user.repository';

const applicationInstanceInclude = {
  applicant: { include: userInclude },
  submitter: { include: userInclude },
  revision: { include: { workflow: true } },
  form_instances: {
    include: {
      form_revision: { include: { form: true, options: true } },
      data_history: {
        orderBy: { created_at: 'desc' as const },
        take: 1,
      },
    },
  },
  workflow_nodes: {
    include: {
      approval_tasks: { orderBy: { created_at: 'asc' as const } },
    },
  },
  events: {
    orderBy: { created_at: 'desc' as const },
  },
};

const formInstanceInclude = {
  form_revision: {
    include: { form: true, options: true },
  },
  workflow_instance: {
    include: {
      applicant: { include: userInclude },
      submitter: { include: userInclude },
      revision: { include: { workflow: true } },
    },
  },
  data_history: {
    orderBy: { created_at: 'desc' as const },
    take: 1,
  },
};

/**
 * Application Repository
 *
 * Data access layer for application_instances operations.
 * Only contains pure data operations without business logic.
 */
@Injectable()
export class ApplicationRepository {
  private readonly logger = new Logger(ApplicationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all available application
   * @returns Array of application DTOs
   */
  async listAvailableApplications(
    userId: number,
    query?: ListAvailableApplicationsQueryDto,
    visibilityWhere?: Prisma.WorkflowWhereInput,
  ): Promise<{ items: ApplicationDto[]; total: number }> {
    const where: Prisma.FormWorkflowBindingWhereInput = {
      form: {
        AND: [
          { is_active: true },
          {
            form_revisions: {
              some: {
                state: RevisionState.ACTIVE,
                name: query?.formName
                  ? { contains: query.formName, mode: 'insensitive' }
                  : undefined,
              },
            },
          },
        ],
        form_tag: query?.formTagIds
          ? {
              some: {
                tag_id: { in: query.formTagIds },
              },
            }
          : undefined,
      },
      workflow: {
        AND: [
          { is_active: true },
          visibilityWhere || {},
          {
            workflow_revisions: {
              some: {
                state: RevisionState.ACTIVE,
                name: query?.workflowName
                  ? { contains: query.workflowName, mode: 'insensitive' }
                  : undefined,
              },
            },
          },
        ],
        workflow_tags: query?.workflowTagIds
          ? {
              some: {
                tag_id: { in: query.workflowTagIds },
              },
            }
          : undefined,
      },
    };

    const total = await this.prisma.formWorkflowBinding.count({ where });

    const bindings = await this.prisma.formWorkflowBinding.findMany({
      where,
      include: {
        workflow: {
          include: {
            workflow_revisions: {
              where: {
                state: RevisionState.ACTIVE,
              },
              orderBy: {
                version: 'desc',
              },
              include: {
                options: true,
              },
            },
          },
        },
        form: {
          include: {
            form_revisions: {
              where: {
                state: RevisionState.ACTIVE,
              },
              orderBy: {
                version: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        created_at: query?.sortOrder || SortOrderEnum.DESC,
      },
      skip:
        query?.page && query?.limit
          ? (query.page - 1) * query.limit
          : undefined,
      take: query?.limit,
    });

    const items = bindings.map((binding) => ApplicationDto.fromPrisma(binding));

    this.logger.debug(
      `Found ${items.length} applications for user: ${userId}!!`,
    );

    return { items, total };
  }

  /**
   * List all application instances submitted by a user
   */
  async listSubmittedApplicationInstances(
    userId: number,
    query: ListApplicationsQueryDto,
    visibilityWhere?: Prisma.WorkflowInstanceWhereInput,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    // Default values to ensure consistent sorting
    const sortBy = query.sortBy || ApplicationSortByEnum.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrderEnum.DESC;

    const where: Prisma.WorkflowInstanceWhereInput = {
      AND: [
        visibilityWhere || {},
        {
          serial_number: query.serialNumber
            ? { contains: query.serialNumber, mode: 'insensitive' }
            : undefined,
          applicant_id: query.applicantId,
          status: query.overallStatus,
          revision: query.workflowName
            ? {
                name: { contains: query.workflowName, mode: 'insensitive' },
              }
            : undefined,
          form_instances: query.formName
            ? {
                some: {
                  form_revision: {
                    name: { contains: query.formName, mode: 'insensitive' },
                  },
                },
              }
            : undefined,
        },
      ],
    };

    // Step 1: Lightweight Fetch - Get only fields needed for sorting
    // This is much lighter than fetching all relations
    const allInstances = await this.prisma.workflowInstance.findMany({
      where,
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    const total = allInstances.length;

    if (total === 0) {
      return { items: [], total: 0 };
    }

    // Step 2: In-Memory Sort
    allInstances.sort((a, b) => {
      // Rule 1: Priority
      const getPriority = (status: string): number => {
        switch (status) {
          case InstanceStatus.RUNNING:
            return 1;
          case InstanceStatus.DRAFT:
            return 2;
          case InstanceStatus.COMPLETED:
            return 3;
          case InstanceStatus.CANCELLED:
            return 4;
          default:
            return 5;
        }
      };
      const pa = getPriority(a.status);
      const pb = getPriority(b.status);

      if (pa !== pb) {
        return pa - pb; // Sort by priority first
      }

      // Rule 2: Time
      let timeA: Date, timeB: Date;

      if (sortBy === ApplicationSortByEnum.CREATED_AT) {
        timeA = a.created_at;
        timeB = b.created_at;
      } else if (sortBy === ApplicationSortByEnum.APPLIED_AT) {
        // Fallback to created_at since applied_at is moved to events
        timeA = a.created_at;
        timeB = b.created_at;
      } else {
        // Default to UPDATED_AT
        timeA = a.updated_at ?? a.created_at;
        timeB = b.updated_at ?? b.created_at;
      }

      const orderMultiplier = sortOrder === SortOrderEnum.ASC ? 1 : -1;
      return (timeA.getTime() - timeB.getTime()) * orderMultiplier;
    });

    // Step 3: Slice IDs (Pagination)
    let targetIds = allInstances.map((i) => i.id);
    if (query.page && query.limit) {
      const start = (query.page - 1) * query.limit;
      targetIds = targetIds.slice(start, start + query.limit);
    }

    // Step 4: Fetch full details ONLY for the paged IDs
    const workflowInstances = await this.prisma.workflowInstance.findMany({
      where: {
        id: { in: targetIds },
      },
      include: applicationInstanceInclude,
    });

    // Step 5: Map back to preserve the sort order (Database IN clause does not guarantee order)
    const items = targetIds
      .map((id) => workflowInstances.find((instance) => instance.id === id))
      .filter((instance): instance is NonNullable<typeof instance> =>
        Boolean(instance),
      )
      .map((workflowInstance) => {
        const formInstance = workflowInstance.form_instances[0];
        if (!formInstance) {
          return null;
        }

        const fullApplicationInstance = {
          ...formInstance,
          workflow_instance: workflowInstance,
          data_history: formInstance.data_history,
        };

        return ApplicationInstanceDto.fromPrisma(
          fullApplicationInstance,
          fullApplicationInstance.workflow_instance.workflow_nodes.map((node) =>
            WorkflowNodeDto.fromPrisma(node),
          ),
        );
      })
      .filter((item) => item !== null);

    return { items, total };
  }

  /**
   * List all application instances pending approval for a user, with custom sorting.
   */
  async listApprovingApplicationInstances(
    userId: number,
    query: ListApplicationsQueryDto,
    visibilityWhere?: Prisma.WorkflowInstanceWhereInput,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    // Default values to ensure Rule 2 is always met
    const sortBy = query.sortBy || ApplicationSortByEnum.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrderEnum.DESC;

    // Step 1: Use a raw query to get the correctly sorted, unique workflow instance IDs.
    // Optimized: Select only necessary fields for sorting instead of full objects
    const result = (
      await this.prisma.approvalTask.findMany({
        select: {
          id: true,
          status: true,
          workflow_node: {
            select: {
              workflow_instance: {
                select: {
                  id: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
        },
        where: {
          status: query.approvalStatus
            ? { in: query.approvalStatus }
            : undefined,
          OR: [{ assignee_id: userId }, { escalated_to: userId }],
          workflow_node: {
            workflow_instance: {
              AND: [
                visibilityWhere || {},
                {
                  serial_number: query.serialNumber
                    ? {
                        contains: query.serialNumber,
                        mode: 'insensitive',
                      }
                    : undefined,
                  applicant_id: query.applicantId,
                  status: query.overallStatus,
                  revision: query.workflowName
                    ? {
                        name: {
                          contains: query.workflowName,
                          mode: 'insensitive',
                        },
                      }
                    : undefined,
                  form_instances: query.formName
                    ? {
                        some: {
                          form_revision: {
                            name: {
                              contains: query.formName,
                              mode: 'insensitive',
                            },
                          },
                        },
                      }
                    : undefined,
                },
              ],
            },
          },
        },
        orderBy: {
          workflow_node: {
            workflow_instance: {
              created_at:
                sortBy === ApplicationSortByEnum.CREATED_AT
                  ? sortOrder
                  : undefined,
              updated_at:
                sortBy === ApplicationSortByEnum.UPDATED_AT
                  ? sortOrder
                  : undefined,
            },
          },
        },
      })
    )
      .sort((a, b) => {
        // 1. Priority Sorting (Rule 1)
        const getPriority = (status: ApprovalStatus): number => {
          switch (status) {
            case ApprovalStatus.PENDING:
              return 1;
            case ApprovalStatus.WAITING:
              return 2;
            default:
              return 3;
          }
        };

        const pa = getPriority(a.status);
        const pb = getPriority(b.status);

        if (pa !== pb) {
          return pa - pb; // Lower priority number first
        }

        // 2. Secondary Sorting (Rule 2) - If priorities are equal, sort by time
        const instanceA = a.workflow_node.workflow_instance;
        const instanceB = b.workflow_node.workflow_instance;

        // Determine which field to sort by
        let timeA: Date, timeB: Date;

        if (sortBy === ApplicationSortByEnum.CREATED_AT) {
          timeA = instanceA.created_at;
          timeB = instanceB.created_at;
        } else if (sortBy === ApplicationSortByEnum.APPLIED_AT) {
          // Fallback to created_at
          timeA = instanceA.created_at;
          timeB = instanceB.created_at;
        } else {
          // Default to UPDATED_AT if sortBy is not CREATED_AT or APPLIED_AT
          timeA = instanceA.updated_at ?? instanceA.created_at;
          timeB = instanceB.updated_at ?? instanceB.created_at;
        }

        // Apply sort order
        const timeValueA = timeA.getTime();
        const timeValueB = timeB.getTime();
        const orderMultiplier = sortOrder === SortOrderEnum.ASC ? 1 : -1;

        return (timeValueA - timeValueB) * orderMultiplier;
      })
      .map((t) => {
        return { flow_id: t.workflow_node.workflow_instance.id, task_id: t.id };
      });

    let workflowInstanceIds = result.map((item) => item.flow_id);
    // Remove duplicates just in case
    workflowInstanceIds = [...new Set(workflowInstanceIds)];

    const total = workflowInstanceIds.length;

    if (workflowInstanceIds.length === 0) {
      return { items: [], total: 0 };
    }

    // Step 1.5: Slice the IDs for pagination BEFORE fetching details
    if (query.page && query.limit) {
      const startIndex = (query.page - 1) * query.limit;
      const endIndex = startIndex + query.limit;
      workflowInstanceIds = workflowInstanceIds.slice(startIndex, endIndex);
    }

    // Step 2: Fetch the full data for the sorted IDs.
    const workflowInstances = await this.prisma.workflowInstance.findMany({
      where: {
        id: {
          in: workflowInstanceIds,
        },
      },
      include: applicationInstanceInclude,
    });

    // Step 3: Map the fetched data back to the sorted order.
    const sortedInstances = workflowInstanceIds
      .map((id) => workflowInstances.find((instance) => instance.id === id))
      .filter((instance): instance is NonNullable<typeof instance> =>
        Boolean(instance),
      );

    const validTaskIds = new Set(result.map((r) => r.task_id));

    const items = sortedInstances
      .map((workflowInstance) => {
        const formInstance = workflowInstance.form_instances[0];
        if (!formInstance) return null;
        const fullApplicationInstance = {
          ...formInstance,
          workflow_instance: workflowInstance,
          data_history: formInstance.data_history,
        };
        return ApplicationInstanceDto.fromPrisma(
          fullApplicationInstance,
          fullApplicationInstance.workflow_instance.workflow_nodes.map(
            (node) => {
              //Only need to list the approval task belongs current User
              const filteredNode = {
                ...node,
                approval_tasks: node.approval_tasks.filter(
                  (task) => validTaskIds.has(task.id), // filter by task ids
                ),
              };
              return WorkflowNodeDto.fromPrisma(filteredNode);
            },
          ),
        );
      })
      .filter((item) => item != null);

    return { items, total };
  }
  /**
   * Get Application Nodes by serial number
   */
  async getApplicationNodes(
    serial_number: string,
  ): Promise<ApplicationNodesDto[]> {
    const workflowInstances = await this.prisma.workflowInstance.findMany({
      where: { serial_number },
      include: {
        workflow_nodes: {
          include: {
            approval_tasks: { orderBy: { created_at: 'asc' as const } },
          },
        },
      },
    });

    if (!workflowInstances || workflowInstances.length === 0) {
      return [];
    }

    return workflowInstances.map((workflowInstance) => {
      const nodes = workflowInstance.workflow_nodes.map((node) =>
        WorkflowNodeDto.fromPrisma(node),
      );
      return ApplicationNodesDto.fromPrisma(
        serial_number,
        workflowInstance.public_id,
        workflowInstance.status,
        nodes,
      );
    });
  }

  /**
   * Get Application Comments by serial number
   */
  async getApplicationComments(
    serial_number: string,
  ): Promise<WorkflowCommentDto[]> {
    const workflowComments = await this.prisma.workflowComment.findMany({
      where: { serial_number },
      include: {
        approval_task: true,
        author: { include: userInclude },
      },
    });

    return workflowComments.map((comment) =>
      WorkflowCommentDto.fromPrisma(
        comment,
        comment.approval_task,
        comment.author,
      ),
    );
  }

  async getApplicationInstance(serialNumber: string): Promise<{
    flowInstance: FlowInstance;
    formData: Record<string, any>;
    workflowInstanceId: number;
  }> {
    const instance = await this.prisma.formInstance.findFirst({
      where: { workflow_instance: { serial_number: serialNumber } },
      include: {
        form_revision: { include: { form: true, options: true } },
        workflow_instance: {
          include: {
            applicant: { include: userInclude },
            submitter: { include: userInclude },
            revision: { include: { workflow: true } },
          },
        },
        data_history: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!instance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serialNumber} not found`,
      );
    }
    const nodes = await this.prisma.workflowNode
      .findMany({
        where: {
          workflow_instance: {
            serial_number: serialNumber,
          },
        },
        include: {
          approval_tasks: { orderBy: { created_at: 'asc' as const } },
        },
        orderBy: { created_at: 'asc' },
      })
      .then((workflowNodes) =>
        workflowNodes.map((node) => WorkflowNodeDto.fromPrisma(node)),
      );
    if (!instance.workflow_instance.revision.workflow) {
      throw new Error('workflow not found!');
    }
    const workflowInstance = WorkflowInstanceDto.fromPrisma(
      instance.workflow_instance,
      toWorkflowRevisionDto(
        instance.workflow_instance.revision.workflow,
        instance.workflow_instance.revision,
      ),
      UserDto.fromPrisma(instance.workflow_instance.applicant),
      UserDto.fromPrisma(instance.workflow_instance.submitter),
      undefined, // Withdrawer no longer exists as direct field
    );
    // Use data from latest snapshot if available, otherwise fallback to column
    const latestSnapshot = instance.data_history?.[0];
    const formData = (latestSnapshot?.data ?? {}) as Record<string, any>;
    const flowInstance = {
      ...workflowInstance,
      nodes,
    };
    return {
      flowInstance,
      formData,
      workflowInstanceId: instance.workflow_instance.id,
    };
  }

  /**
   * Get Application Workflow History by serial number
   */
  async getApplicationWorkflowHistory(
    serial_number: string,
  ): Promise<WorkflowHistoryDto[]> {
    const historyRecords = await this.prisma.workflowEvent.findMany({
      where: { workflow_instance: { serial_number } },
      orderBy: { created_at: 'asc' },
    });

    return historyRecords.map((record) =>
      WorkflowHistoryDto.fromPrisma(record),
    );
  }

  /**
   * Find application latest revision by workflow id
   */
  async findLatestApplicationRevision(workflow_id: number, form_id: number) {
    const targetWorkflow = await this.prisma.workflow.findUnique({
      where: { id: workflow_id },
      include: {
        permissions: true,
        workflow_revisions: {
          where: { state: RevisionState.ACTIVE },
          orderBy: {
            version: 'desc',
          },
          include: {
            options: true,
          },
        },
      },
    });

    if (!targetWorkflow || targetWorkflow.workflow_revisions.length === 0) {
      throw new NotFoundException(
        `No active workflow revision for workflow_id ${workflow_id} found`,
      );
    }

    const targetForm = await this.prisma.form.findUnique({
      where: { id: form_id },
      include: {
        form_revisions: {
          where: { state: RevisionState.ACTIVE },
          orderBy: {
            version: 'desc',
          },
        },
      },
    });

    if (!targetForm || targetForm.form_revisions.length === 0) {
      throw new NotFoundException(
        `No active form revision for form_id ${form_id} found`,
      );
    }

    return {
      form: targetForm.form_revisions[0],
      workflow: {
        ...targetWorkflow.workflow_revisions[0],
        workflow: {
          permissions: targetWorkflow.permissions,
          created_by: targetWorkflow.created_by,
        },
      },
    };
  }

  /**
   * Creates a new application instance
   * @param data - The application instance data
   * @param tx - Optional Prisma transaction client
   * @returns The created application instance
   */
  async createApplicationInstance(
    data: {
      serial_number: string;
      form_id?: number;
      workflow_id?: number;
      applicant_id?: number;
    },
    tx?: PrismaTransactionClient,
  ): Promise<ApplicationInstance> {
    const client = tx || this.prisma;
    return client.applicationInstance.create({
      data,
    });
  }

  /**
   * Deletes an application instance by serial number
   * @param serialNumber - The serial number of the application instance
   * @param tx - Optional Prisma transaction client
   * @returns The deleted application instance
   */
  async deleteApplicationInstance(
    serialNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<ApplicationInstance> {
    const client = tx || this.prisma;
    return client.applicationInstance.delete({
      where: { serial_number: serialNumber },
    });
  }

  async findFormInstance(serial_number: string, tx?: PrismaTransactionClient) {
    const client = tx || this.prisma;
    return client.formInstance.findFirst({
      where: { workflow_instance: { serial_number } },
      include: formInstanceInclude,
    });
  }

  async updateFormData(
    instanceId: number,
    formData: JsonObject,
    userId: number,
    tx?: PrismaTransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.formInstance.update({
      where: {
        id: instanceId,
      },
      data: {
        updated_by: userId,
        updated_at: new Date(),
      },
      include: formInstanceInclude,
    });
  }
}
