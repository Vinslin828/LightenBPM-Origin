import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  bindingFromPrisma,
  FormWorkflowBinding,
} from '../../form/types/application-binding.types';
import { FormWithRevision } from '../../form/types/form.types';
import { Prisma } from '@prisma/client';
import { RevisionState } from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

/**
 * Form-Workflow Binding Repository
 *
 * Data access layer for form-workflow binding operations.
 * Only contains pure data queries without business logic.
 */
@Injectable()
export class FormWorkflowBindingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find form's internal ID by workflow public ID
   * @param workflowId - The workflow's public ID (UUID)
   * @returns The form's internal ID if binding exists, null otherwise
   */
  async findFormIdByWorkflowPublicId(
    workflowId: string,
  ): Promise<number | null> {
    const binding = await this.prisma.formWorkflowBinding.findFirst({
      where: {
        workflow: {
          public_id: workflowId,
        },
      },
      select: {
        form_id: true,
      },
    });

    return binding?.form_id ?? null;
  }

  /**
   * Find form's internal ID by workflow ID
   * @param workflowId - The workflow's internal ID
   * @returns The form's internal ID if binding exists, null otherwise
   */
  async findFormIdByWorkflowId(workflowId: number): Promise<number | null> {
    const binding = await this.prisma.formWorkflowBinding.findFirst({
      where: {
        workflow_id: workflowId,
      },
      select: {
        form_id: true,
      },
    });

    return binding?.form_id ?? null;
  }

  /**
   * Find workflow with active revision by form public ID.
   * Used to get flow_definition (start node component_rules) from a form.
   */
  async findWorkflowWithRevisionByFormPublicId(formPublicId: string) {
    const binding = await this.prisma.formWorkflowBinding.findFirst({
      where: {
        form: { public_id: formPublicId },
      },
      include: {
        workflow: {
          include: {
            workflow_revisions: {
              where: { state: RevisionState.ACTIVE },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!binding?.workflow?.workflow_revisions?.[0]) return null;

    return {
      workflow: binding.workflow,
      revision: binding.workflow.workflow_revisions[0],
    };
  }

  async getBindingFormByWorkflowId(
    workflowId: number,
  ): Promise<FormWithRevision | null> {
    const bindingForm = await this.prisma.formWorkflowBinding.findFirst({
      where: {
        workflow_id: workflowId,
      },
      include: {
        form: {
          include: {
            form_revisions: {
              where: {
                state: RevisionState.ACTIVE,
              },
              orderBy: { version: 'desc' },
              include: {
                options: true,
              },
            },
            form_tag: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    return bindingForm?.form ?? null;
  }

  async getBinding(id: number): Promise<FormWorkflowBinding> {
    const binding = await this.prisma.formWorkflowBinding.findUnique({
      where: {
        id,
      },
    });
    if (!binding) {
      throw new NotFoundException(
        `Applciation Form-Workflow Binding with id: ${id} Not Found!`,
      );
    }
    return bindingFromPrisma(binding);
  }

  async findFormWithRevisionsAndTags(publicId: string) {
    return this.prisma.form.findUnique({
      where: { public_id: publicId },
      include: {
        form_revisions: {
          include: {
            options: true,
          },
          orderBy: {
            version: 'desc',
          },
        },
        form_tag: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async findWorkflowByPublicId(publicId: string) {
    return this.prisma.workflow.findUnique({
      where: { public_id: publicId },
    });
  }

  async findExistingBinding(formId: number, workflowId: number) {
    return this.prisma.formWorkflowBinding.findFirst({
      where: {
        form_id: formId,
        workflow_id: workflowId,
      },
      include: {
        form: {
          include: {
            form_revisions: {
              include: {
                options: true,
              },
              orderBy: { version: 'desc' },
            },
          },
        },
        workflow: {
          include: {
            workflow_revisions: {
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    });
  }

  async findMany(where: Prisma.FormWorkflowBindingWhereInput) {
    return this.prisma.formWorkflowBinding.findMany({
      where,
      include: { form: true, workflow: true },
    });
  }

  async findUnique(id: number) {
    return this.prisma.formWorkflowBinding.findUnique({
      where: { id },
      include: { form: true, workflow: true },
    });
  }

  async deleteByWorkflowId(
    workflowId: number,
    tx?: PrismaTransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const client = tx || this.prisma;
    return await client.formWorkflowBinding.deleteMany({
      where: {
        workflow_id: workflowId,
      },
    });
  }

  async deleteByFormId(
    formId: number,
    tx?: PrismaTransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const client = tx || this.prisma;
    return await client.formWorkflowBinding.deleteMany({
      where: {
        form_id: formId,
      },
    });
  }

  async create(
    data: Prisma.FormWorkflowBindingUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.formWorkflowBinding.create({
      data,
    });
  }

  async delete(id: number, tx?: PrismaTransactionClient): Promise<void> {
    const client = tx || this.prisma;
    try {
      await client.formWorkflowBinding.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }
}
