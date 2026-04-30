import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  Form,
  FormRevision,
  FormInstance,
  FormInstanceData,
  WorkflowInstance,
  WorkflowRevisions,
  Workflow,
  User,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';
import { userInclude } from '../../user/repository/user.repository';

/**
 * Type for FormInstance with relations used in createInstance
 * Exported for use in service layer without exposing Prisma internals
 */
export type FormInstanceWithRelations = Prisma.FormInstanceGetPayload<{
  include: {
    form_revision: {
      include: {
        form: true;
        options: true;
      };
    };
    data_history: true;
  };
}>;

/**
 * Form Instance Repository
 *
 * Data access layer for form_instances operations.
 * Only contains pure data operations without business logic.
 */
@Injectable()
export class FormInstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a form instance by workflow instance ID
   * @param workflowInstanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The form instance or null if not found
   */
  async findByWorkflowInstanceId(
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<(FormInstance & { data_history: FormInstanceData[] }) | null> {
    const client = tx || this.prisma;
    return client.formInstance.findUnique({
      where: { workflow_instance_id: workflowInstanceId },
      include: {
        data_history: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Finds a form instance by its public ID
   * @param publicId - The public UUID of the form instance
   * @returns The form instance or null if not found
   */
  async findByPublicId(publicId: string): Promise<FormInstance | null> {
    return this.prisma.formInstance.findUnique({
      where: { public_id: publicId },
    });
  }

  /**
   * Finds a form instance by serial number with full details
   * @param serialNumber - The serial number
   * @returns The form instance with form revision, workflow instance and related data
   */
  async findBySerialNumberWithDetails(
    serialNumber: string,
    visibilityWhere?: Prisma.WorkflowInstanceWhereInput,
  ): Promise<
    | (FormInstance & {
        form_revision: FormRevision & {
          form: Form;
          options: Prisma.FormOptionsGetPayload<any> | null;
        };
        workflow_instance: WorkflowInstance & {
          applicant: User;
          submitter: User;
          revision: WorkflowRevisions & { workflow: Workflow };
          events?: any[];
        };
        data_history: FormInstanceData[];
      })
    | null
  > {
    return this.prisma.formInstance.findFirst({
      where: {
        serial_number: serialNumber,
        workflow_instance: visibilityWhere || {},
      },
      include: {
        form_revision: { include: { form: true, options: true } },
        workflow_instance: {
          include: {
            applicant: { include: userInclude },
            submitter: { include: userInclude },
            revision: { include: { workflow: true } },
            events: true,
          },
        },
        data_history: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Creates a new form instance (basic version without relations)
   * @param data - The form instance data
   * @param tx - Optional Prisma transaction client
   * @returns The created form instance
   */
  async create(
    data:
      | Prisma.FormInstanceUncheckedCreateInput
      | (Omit<Prisma.FormInstanceUncheckedCreateInput, 'public_id'> & {
          public_id?: string;
        }),
    tx?: PrismaTransactionClient,
  ): Promise<FormInstance> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return client.formInstance.create({
      data: data as Prisma.FormInstanceUncheckedCreateInput,
    });
  }

  /**
   * Creates a new form instance with form_revision relations
   * (form_revision with form and options)
   * @param data - The form instance data
   * @param tx - Optional Prisma transaction client
   * @returns The created form instance with relations
   */
  async createWithRelations(
    data:
      | Prisma.FormInstanceUncheckedCreateInput
      | (Omit<Prisma.FormInstanceUncheckedCreateInput, 'public_id'> & {
          public_id?: string;
        }),
    tx?: PrismaTransactionClient,
  ): Promise<FormInstanceWithRelations> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return client.formInstance.create({
      data: data as Prisma.FormInstanceUncheckedCreateInput,
      include: {
        form_revision: {
          include: {
            form: true,
            options: true,
          },
        },
        data_history: true,
      },
    });
  }

  /**
   * Finds a form's internal ID by its public ID
   * @param formPublicId - The public ID of the form
   * @returns The internal ID or null if not found
   */
  async findFormIdByPublicId(formPublicId: string): Promise<number | null> {
    const form = await this.prisma.form.findUnique({
      where: { public_id: formPublicId },
      select: { id: true },
    });
    return form?.id ?? null;
  }

  /**
   * Finds form instances with a matching field value in their latest form data.
   * Used for duplicate checking across submitted instances of the same form.
   * @param formId - The internal form ID
   * @param fieldName - The JSON field name in form_instance_data.data
   * @param fieldValue - The value to match (converted to string for PostgreSQL ->> comparison)
   * @returns Array of matching rows with serial number, applicant info, status, and submission time
   */
  async findDuplicatesByFieldValue(
    formId: number,
    fieldName: string,
    fieldValue: string,
  ): Promise<
    {
      serial_number: string;
      applicant_id: number;
      applicant_name: string;
      status: string;
      submitted_at: Date;
    }[]
  > {
    return this.prisma.$queryRaw`
      SELECT
        wi.serial_number,
        wi.applicant_id,
        u.name AS applicant_name,
        wi.status,
        wi.created_at AS submitted_at
      FROM form_instances fi
      JOIN form_revisions fr ON fi.revision_id = fr.id
      JOIN workflow_instances wi ON fi.workflow_instance_id = wi.id
      JOIN users u ON wi.applicant_id = u.id
      JOIN LATERAL (
        SELECT data
        FROM form_instance_data
        WHERE form_instance_id = fi.id
        ORDER BY created_at DESC
        LIMIT 1
      ) fid ON true
      WHERE fr.form_id = ${formId}
        AND wi.status IN ('RUNNING', 'COMPLETED')
        AND fid.data ->> ${fieldName} = ${fieldValue}
    `;
  }

  /**
   * Deletes multiple form instances by serial number
   * @param serialNumber - The serial number
   * @param tx - Optional Prisma transaction client
   * @returns The count of deleted records
   */
  async deleteManyBySerialNumber(
    serialNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const result = await client.formInstance.deleteMany({
      where: { serial_number: serialNumber },
    });
    return result.count;
  }
}
