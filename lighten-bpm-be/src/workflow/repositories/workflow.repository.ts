import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RevisionState, Workflow } from '../../common/types/common.types';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { CreateWorkflowRevisionDto } from '../dto/create-workflow-revision.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { ListWorkflowsQueryDto } from '../dto/list-workflows-query.dto';
import { generatePublicId } from '../../common/utils/id-generator';
import { PermissionBuilderService } from '../../common/permission/permission-builder.service';

const WorkflowRevisionsState = RevisionState;

const WorkflowRevisionWithRelations =
  Prisma.validator<Prisma.WorkflowRevisionsDefaultArgs>()({
    include: {
      workflow: {
        include: {
          permissions: true,
        },
      },
    },
  });

export type WorkflowRevisionWithRelations = Prisma.WorkflowRevisionsGetPayload<
  typeof WorkflowRevisionWithRelations
>;

const WorkflowWithLatestRevision =
  Prisma.validator<Prisma.WorkflowDefaultArgs>()({
    include: {
      workflow_revisions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
      workflow_tags: { include: { tag: true } },
      permissions: true,
    },
  });

export type WorkflowWithLatestRevision = Prisma.WorkflowGetPayload<
  typeof WorkflowWithLatestRevision
>;

const WorkflowWithRevisions = Prisma.validator<Prisma.WorkflowDefaultArgs>()({
  include: {
    workflow_revisions: true,
    workflow_tags: { include: { tag: true } },
    permissions: true,
  },
});

export type WorkflowWithRevisions = Prisma.WorkflowGetPayload<
  typeof WorkflowWithRevisions
>;

const WorkflowPermissionWithRelations =
  Prisma.validator<Prisma.WorkflowPermissionDefaultArgs>()({
    include: { workflow: { include: { permissions: true } } },
  });

export type WorkflowPermissionWithRelations =
  Prisma.WorkflowPermissionGetPayload<typeof WorkflowPermissionWithRelations>;

@Injectable()
export class WorkflowRepository {
  constructor(private prisma: PrismaService) {}

  async listWorkflows(
    skip?: number,
    take?: number,
    query?: ListWorkflowsQueryDto,
    visibilityWhere?: Prisma.WorkflowWhereInput,
  ): Promise<{ items: WorkflowWithLatestRevision[]; total: number }> {
    const where: Prisma.WorkflowWhereInput = {
      AND: [
        { is_active: true },
        visibilityWhere || {},
        query?.name
          ? {
              workflow_revisions: {
                some: {
                  name: { contains: query.name, mode: 'insensitive' },
                },
              },
            }
          : {},
        query?.tagIds
          ? {
              workflow_tags: {
                some: {
                  tag_id: { in: query.tagIds },
                },
              },
            }
          : {},
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        skip,
        take,
        include: {
          workflow_revisions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          workflow_tags: { include: { tag: true } },
          permissions: true,
        },
        orderBy: { created_at: query?.sortOrder || 'desc' },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return { items, total };
  }

  async findWorkflowByPublicId(publicId: string) {
    return this.prisma.workflow.findUnique({
      where: { public_id: publicId },
      include: { permissions: true },
    });
  }

  async findWorkflowById(id: number): Promise<Workflow | null> {
    return this.prisma.workflow.findUnique({
      where: { id: id },
    });
  }

  async listWorkflowRevisions(workflowId: number) {
    return this.prisma.workflowRevisions.findMany({
      where: { workflow_id: workflowId },
      orderBy: { version: 'desc' },
    });
  }

  async createWorkflow(
    createWorkflowDto: CreateWorkflowDto,
    userId: number,
  ): Promise<WorkflowWithRevisions> {
    const { name, description, isActive, tags, permissions } =
      createWorkflowDto;

    const normalizedPermissions = permissions
      ? PermissionBuilderService.normalizePermissions(permissions)
      : undefined;

    return this.prisma.workflow.create({
      data: {
        public_id: generatePublicId(),
        is_active: isActive ?? true,
        created_by: userId,
        updated_by: userId,
        workflow_revisions: {
          create: {
            public_id: generatePublicId(),
            name,
            description,
            version: 1,
            state: WorkflowRevisionsState.DRAFT,
            created_by: userId,
            updated_by: userId,
          },
        },
        workflow_tags: {
          create: tags?.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
        permissions: {
          create: normalizedPermissions?.map((p) => ({
            grantee_type: p.grantee_type,
            grantee_value: p.grantee_value,
            action: p.action,
          })),
        },
      },
      include: {
        workflow_tags: { include: { tag: true } },
        workflow_revisions: true,
        permissions: true,
      },
    }) as unknown as Promise<WorkflowWithRevisions>;
  }

  async createWorkflowRevision(
    workflowId: number,
    data: CreateWorkflowRevisionDto & { public_id?: string },
    userId: number,
    status: RevisionState = WorkflowRevisionsState.DRAFT,
    tx: Prisma.TransactionClient,
  ) {
    const { name, description, flow_definition, public_id } = data;
    const latestRevision = await tx.workflowRevisions.findFirst({
      where: { workflow_id: workflowId },
      orderBy: { version: 'desc' },
    });

    // Version number: increment from latest, or start at 1
    const version = latestRevision ? latestRevision.version + 1 : 1;

    return tx.workflowRevisions.create({
      data: {
        public_id: public_id || generatePublicId(),
        workflow_id: workflowId,
        name,
        description,
        flow_definition: flow_definition as unknown as Prisma.InputJsonValue,
        version,
        state: status, // Default new revision status to DRAFT
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async findWorkflowWithLatestRevision(
    workflowId: string,
  ): Promise<WorkflowWithLatestRevision | null> {
    return this.prisma.workflow.findUnique({
      where: { public_id: workflowId },
      include: {
        workflow_revisions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        workflow_tags: { include: { tag: true } },
        permissions: true,
      },
    });
  }

  async findWorkflowRevisionByPublicId(
    revisionId: string,
  ): Promise<WorkflowRevisionWithRelations | null> {
    return this.prisma.workflowRevisions.findUnique({
      where: { public_id: revisionId },
      include: {
        workflow: {
          include: { permissions: true },
        },
      },
    });
  }

  async findWorkflowRevisionById(
    revisionId: number,
  ): Promise<WorkflowRevisionWithRelations | null> {
    return this.prisma.workflowRevisions.findUnique({
      where: { id: revisionId },
      include: {
        workflow: {
          include: { permissions: true },
        },
      },
    });
  }

  async updateWorkflow(
    workflowId: number,
    workflowPublicId: string,
    data: UpdateWorkflowDto,
    updated_by: number,
    tx: Prisma.TransactionClient,
  ) {
    const { tags, is_active, serial_prefix } = data;
    if (tags) {
      await tx.workflowTag.deleteMany({
        where: { workflow_id: workflowId },
      });
      await tx.workflowTag.createMany({
        data: tags.map((tagId) => ({
          workflow_id: workflowId,
          tag_id: tagId,
        })),
      });
    }

    return tx.workflow.update({
      where: { public_id: workflowPublicId },
      data: {
        is_active: is_active,
        serial_prefix: serial_prefix,
        updated_by,
      },
    });
  }

  async updateWorkflowRevision(
    revisionId: string,
    data: Partial<{
      status: RevisionState;
      flow_definition: object;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    return prisma.workflowRevisions.update({
      where: { public_id: revisionId },
      data: {
        ...(data.status && { state: data.status }),
        ...(data.flow_definition && {
          flow_definition:
            data.flow_definition as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async archiveActiveWorkflowRevisions(
    workflowId: number,
    excludeRevisionId: number,
    tx: Prisma.TransactionClient,
  ) {
    await (tx || this.prisma).workflowRevisions.updateMany({
      where: {
        workflow_id: workflowId,
        id: { not: excludeRevisionId },
        state: WorkflowRevisionsState.ACTIVE,
      },
      data: { state: WorkflowRevisionsState.ARCHIVED },
    });
  }

  async softDeleteWorkflow(publicId: string): Promise<Workflow> {
    return this.prisma.workflow.update({
      where: { public_id: publicId },
      data: { is_active: false },
    });
  }

  async deleteWorkflow(publicId: string): Promise<Workflow | null> {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findUnique({
        where: { public_id: publicId },
        include: { workflow_revisions: { select: { id: true } } },
      });

      if (!workflow) return null;

      // 1. Find all instances for these revisions
      const revisionIds = workflow.workflow_revisions.map((r) => r.id);
      const instances = await tx.workflowInstance.findMany({
        where: { revision_id: { in: revisionIds } },
        select: { id: true, serial_number: true },
      });

      const instanceIds = instances.map((i) => i.id);
      const serialNumbers = instances.map((i) => i.serial_number);

      // 2. Delete all dependent data in correct order
      // Clear subflow references from ANY node in the system
      if (instanceIds.length > 0) {
        await tx.workflowNode.updateMany({
          where: { subflow_instance_id: { in: instanceIds } },
          data: { subflow_instance_id: null },
        });
      }

      // Delete ALL nodes associated with this workflow's revisions
      await tx.workflowNode.deleteMany({
        where: {
          workflow_instance: {
            revision_id: { in: revisionIds },
          },
        },
      });

      if (serialNumbers.length > 0) {
        // ApplicationInstance cascades to WorkflowInstance, FormInstance, etc.
        // But we delete WorkflowInstance explicitly first just in case
        await tx.workflowInstance.deleteMany({
          where: { id: { in: instanceIds } },
        });

        await tx.applicationInstance.deleteMany({
          where: { serial_number: { in: serialNumbers } },
        });
      }

      // 3. Delete the workflow (cascades to revisions, tags, permissions)
      return tx.workflow.delete({ where: { id: workflow.id } });
    });
  }

  async deleteWorkflowRevision(revisionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const revision = await tx.workflowRevisions.findUnique({
        where: { public_id: revisionId },
        select: { id: true },
      });

      if (!revision) return;

      // 1. Find all instances for this revision
      const instances = await tx.workflowInstance.findMany({
        where: { revision_id: revision.id },
        select: { id: true, serial_number: true },
      });

      const instanceIds = instances.map((i) => i.id);
      const serialNumbers = instances.map((i) => i.serial_number);

      // 2. Delete all dependent data in correct order
      if (instanceIds.length > 0) {
        await tx.workflowNode.deleteMany({
          where: { instance_id: { in: instanceIds } },
        });
      }

      if (serialNumbers.length > 0) {
        await tx.applicationInstance.deleteMany({
          where: { serial_number: { in: serialNumbers } },
        });
      }

      // 3. Delete the revision
      await tx.workflowRevisions.delete({
        where: { id: revision.id },
      });
    });
  }

  async findPermissionsByWorkflowId(
    workflowId: number,
  ): Promise<Prisma.WorkflowPermissionGetPayload<object>[]> {
    return this.prisma.workflowPermission.findMany({
      where: { workflow_id: workflowId },
    });
  }

  async findPermissionById(
    id: number,
  ): Promise<WorkflowPermissionWithRelations | null> {
    return this.prisma.workflowPermission.findUnique({
      where: { id },
      include: { workflow: { include: { permissions: true } } },
    });
  }

  async createPermissions(
    workflowId: number,
    data: Prisma.WorkflowPermissionCreateWithoutWorkflowInput[],
  ): Promise<Prisma.WorkflowPermissionGetPayload<object>[]> {
    const normalizedData = PermissionBuilderService.normalizePermissions(data);

    return this.prisma.$transaction(
      normalizedData.map((p) =>
        this.prisma.workflowPermission.create({
          data: {
            ...p,
            workflow_id: workflowId,
          },
        }),
      ),
    );
  }

  async deletePermission(
    id: number,
  ): Promise<Prisma.WorkflowPermissionGetPayload<object>> {
    return this.prisma.workflowPermission.delete({
      where: { id },
    });
  }

  async deletePermissionsByQuery(
    workflowId: number,
    query: {
      grantee_type?: string;
      grantee_value?: string;
      action?: string;
    },
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.workflowPermission.deleteMany({
      where: {
        workflow_id: workflowId,
        ...query,
      } as Prisma.WorkflowPermissionWhereInput,
    });
  }

  async setPermissions(
    workflowId: number,
    data: Prisma.WorkflowPermissionCreateWithoutWorkflowInput[],
  ): Promise<Prisma.WorkflowPermissionGetPayload<object>[]> {
    const normalizedData = PermissionBuilderService.normalizePermissions(data);

    return this.prisma.$transaction(async (tx) => {
      await tx.workflowPermission.deleteMany({
        where: { workflow_id: workflowId },
      });

      return Promise.all(
        normalizedData.map((p) =>
          tx.workflowPermission.create({
            data: {
              ...p,
              workflow_id: workflowId,
            },
          }),
        ),
      );
    });
  }
}
