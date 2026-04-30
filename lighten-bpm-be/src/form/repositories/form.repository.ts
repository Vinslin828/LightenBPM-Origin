import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  RevisionState,
  Form,
  FormRevision,
} from '../../common/types/common.types';
import type { FormSchema } from '../../flow-engine/types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';
import { CreateFormDto } from '../dto/create-form.dto';
import { PermissionBuilderService } from '../../common/permission/permission-builder.service';

// Define the shape of the data returned by findAll and findByPublicId
const formWithRelations = Prisma.validator<Prisma.FormDefaultArgs>()({
  include: {
    form_revisions: {
      include: { options: true },
      orderBy: { version: 'desc' },
      take: 1,
    },
    form_tag: {
      include: {
        tag: true,
      },
    },
    permissions: true,
  },
});

export type FormWithRelations = Prisma.FormGetPayload<typeof formWithRelations>;

// Define the shape of form revision with options
const revisionWithOptions = Prisma.validator<Prisma.FormRevisionDefaultArgs>()({
  include: {
    options: true,
  },
});

export type FormRevisionWithOptions = Prisma.FormRevisionGetPayload<
  typeof revisionWithOptions
>;

// Define the shape of form revision with form and tags
const revisionWithFormAndTags =
  Prisma.validator<Prisma.FormRevisionDefaultArgs>()({
    include: {
      form: {
        include: {
          form_tag: {
            include: {
              tag: true,
            },
          },
          permissions: true,
        },
      },
      options: true,
    },
  });

export type FormRevisionWithFormAndTags = Prisma.FormRevisionGetPayload<
  typeof revisionWithFormAndTags
>;

const FormPermissionWithRelations =
  Prisma.validator<Prisma.FormPermissionDefaultArgs>()({
    include: { form: { include: { permissions: true } } },
  });

export type FormPermissionWithRelations = Prisma.FormPermissionGetPayload<
  typeof FormPermissionWithRelations
>;

/**
 * Form Repository
 *
 * Data access layer for form operations.
 * Only contains pure data queries without business logic.
 */
@Injectable()
export class FormRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find forms with pagination and filters.
   * Fetches latest revision and tags for each form.
   *
   * @param params Filter and pagination parameters
   * @param tx Optional transaction client
   * @returns Forms and total count
   */
  async findAll(
    params: {
      skip: number;
      take: number;
      name?: string;
      tagIds?: number[];
      sortOrder?: 'asc' | 'desc';
      visibilityWhere?: Prisma.FormWhereInput;
    },
    tx?: PrismaTransactionClient,
  ): Promise<{ items: FormWithRelations[]; total: number }> {
    const where: Prisma.FormWhereInput = {
      AND: [
        { is_active: true },
        params.visibilityWhere || {},
        params.name
          ? {
              form_revisions: {
                some: {
                  name: { contains: params.name, mode: 'insensitive' },
                },
              },
            }
          : {},
        params.tagIds
          ? {
              form_tag: {
                some: {
                  tag_id: { in: params.tagIds },
                },
              },
            }
          : {},
      ],
    };

    const findManyArgs: Prisma.FormFindManyArgs = {
      where,
      skip: params.skip,
      take: params.take,
      include: formWithRelations.include,
      orderBy: { created_at: params.sortOrder || 'desc' },
    };

    const countArgs: Prisma.FormCountArgs = { where };

    // If a transaction client is provided, use it.
    // Note: Interactive Transaction clients do not support array-based $transaction.
    if (tx) {
      const [items, total] = await Promise.all([
        tx.form.findMany(findManyArgs) as Promise<FormWithRelations[]>,
        tx.form.count(countArgs),
      ]);
      return { items, total };
    }

    // If no tx provided, use the efficient array-based $transaction on the main client
    const [items, total] = await this.prisma.$transaction([
      this.prisma.form.findMany(
        findManyArgs,
      ) as unknown as Prisma.PrismaPromise<FormWithRelations[]>,
      this.prisma.form.count(countArgs),
    ]);

    return { items, total };
  }

  /**
   * Find a form by its public ID.
   * Fetches latest revision and tags.
   *
   * @param publicId The form's public ID
   * @param tx Optional transaction client
   * @returns The form or null if not found
   */
  async findByPublicId(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<FormWithRelations | null> {
    const client = tx || this.prisma;
    return client.form.findUnique({
      where: { public_id: publicId },
      include: formWithRelations.include,
    }) as Promise<FormWithRelations | null>;
  }

  /**
   * Find all revisions for a given form ID.
   *
   * @param formId The form's internal ID
   * @param tx Optional transaction client
   * @returns List of revisions with options
   */
  async findRevisionsByFormId(
    formId: number,
    tx?: PrismaTransactionClient,
  ): Promise<FormRevisionWithOptions[]> {
    const client = tx || this.prisma;
    return client.formRevision.findMany({
      where: { form_id: formId },
      orderBy: { version: 'desc' },
      include: revisionWithOptions.include,
    }) as Promise<FormRevisionWithOptions[]>;
  }

  /**
   * Find a form revision by its public ID.
   * Fetches parent form, tags, and options.
   *
   * @param publicId The revision's public ID
   * @param tx Optional transaction client
   * @returns The revision or null if not found
   */
  async findRevisionByPublicId(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<FormRevisionWithFormAndTags | null> {
    const client = tx || this.prisma;
    return client.formRevision.findUnique({
      where: { public_id: publicId },
      include: revisionWithFormAndTags.include,
    }) as Promise<FormRevisionWithFormAndTags | null>;
  }

  /**
   * Delete a form revision by its public ID.
   *
   * @param publicId The revision's public ID
   * @param tx Optional transaction client
   * @returns The deleted revision
   */
  async deleteRevision(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<FormRevision> {
    const client = tx || this.prisma;
    return client.formRevision.delete({
      where: { public_id: publicId },
    });
  }

  /**
   * Soft delete a form by its public ID (set is_active = false).
   *
   * @param publicId The form's public ID
   * @param tx Optional transaction client
   * @returns The updated form
   */
  async softDelete(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<Form> {
    const client = tx || this.prisma;
    return client.form.update({
      where: { public_id: publicId },
      data: { is_active: false },
    });
  }

  /**
   * Hard delete a form by its public ID.
   *
   * @param publicId The form's public ID
   * @param tx Optional transaction client
   * @returns The deleted form or null (if handled by logic, but Prisma throws if not found)
   */
  async delete(publicId: string, tx?: PrismaTransactionClient): Promise<Form> {
    const client = tx || this.prisma;
    return client.form.delete({
      where: { public_id: publicId },
    });
  }

  /**
   * Create a new form with nested relations.
   *
   * @param data The form create input
   * @param tx Optional transaction client
   * @returns The created form with relations
   */
  async create(
    data: CreateFormDto & {
      public_id?: string;
      created_by: number;
      updated_by: number;
      is_active?: boolean;
      form_revisions?: Prisma.FormRevisionCreateNestedManyWithoutFormInput;
      form_tag?: Prisma.FormTagCreateNestedManyWithoutFormInput;
    },
    tx?: PrismaTransactionClient,
  ): Promise<FormWithRelations> {
    const client = tx || this.prisma;
    const {
      permissions,
      tags,
      form_revisions,
      form_tag,
      public_id,
      is_template,
      is_active,
      created_by,
      updated_by,
    } = data;

    const formPublicId = public_id || generatePublicId();

    const normalizedPermissions = permissions
      ? PermissionBuilderService.normalizePermissions(permissions)
      : undefined;

    return client.form.create({
      data: {
        public_id: formPublicId,
        is_template: is_template ?? false,
        is_active: is_active ?? true,
        created_by,
        updated_by,
        form_revisions,
        permissions: {
          create: normalizedPermissions?.map((p) => ({
            grantee_type: p.grantee_type,
            grantee_value: p.grantee_value,
            action: p.action,
          })),
        },
        form_tag: form_tag ?? {
          create: tags?.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      },
      include: formWithRelations.include,
    }) as Promise<FormWithRelations>;
  }

  /**
   * Update a form by its public ID.
   *
   * @param publicId The form's public ID
   * @param data The form update input
   * @param tx Optional transaction client
   * @returns The updated form
   */
  async update(
    publicId: string,
    data: Prisma.FormUpdateInput | Prisma.FormUncheckedUpdateInput,
    tx?: PrismaTransactionClient,
  ): Promise<Form> {
    const client = tx || this.prisma;
    return client.form.update({
      where: { public_id: publicId },
      data,
    });
  }

  /**
   * Update tags for a form. Deletes existing tags and creates new ones.
   *
   * @param formId The form's internal ID
   * @param tagIds The list of tag IDs to link
   * @param tx Optional transaction client
   */
  async updateTags(
    formId: number,
    tagIds: number[],
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.formTag.deleteMany({ where: { form_id: formId } });
    if (tagIds.length > 0) {
      await client.formTag.createMany({
        data: tagIds.map((tagId) => ({ form_id: formId, tag_id: tagId })),
      });
    }
  }

  /**
   * Find the latest revision for a form.
   *
   * @param formId The form's internal ID
   * @param tx Optional transaction client
   * @returns The latest revision with options
   */
  async findLatestRevision(
    formId: number,
    tx?: PrismaTransactionClient,
  ): Promise<FormRevisionWithOptions | null> {
    const client = tx || this.prisma;
    return client.formRevision.findFirst({
      where: { form_id: formId },
      orderBy: { version: 'desc' },
      include: revisionWithOptions.include,
    }) as Promise<FormRevisionWithOptions | null>;
  }

  /**
   * Create a new form revision.
   *
   * @param data The revision create input
   * @param tx Optional transaction client
   * @returns The created revision with options
   */
  async createRevision(
    data:
      | (
          | Prisma.FormRevisionCreateInput
          | Prisma.FormRevisionUncheckedCreateInput
        )
      | (Omit<
          | Prisma.FormRevisionCreateInput
          | Prisma.FormRevisionUncheckedCreateInput,
          'public_id'
        > & { public_id?: string }),
    tx?: PrismaTransactionClient,
  ): Promise<FormRevisionWithOptions> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return client.formRevision.create({
      data: data as Prisma.FormRevisionCreateInput,
      include: revisionWithOptions.include,
    }) as Promise<FormRevisionWithOptions>;
  }

  /**
   * Update a form revision by its public ID.
   *
   * @param publicId The revision's public ID
   * @param data The revision update input
   * @param tx Optional transaction client
   * @returns The updated revision with options
   */
  async updateRevision(
    publicId: string,
    data:
      | Prisma.FormRevisionUpdateInput
      | Prisma.FormRevisionUncheckedUpdateInput,
    tx?: PrismaTransactionClient,
  ): Promise<FormRevisionWithOptions> {
    const client = tx || this.prisma;
    return client.formRevision.update({
      where: { public_id: publicId },
      data,
      include: revisionWithOptions.include,
    }) as Promise<FormRevisionWithOptions>;
  }

  /**
   * Archive all active revisions for a form except the specified one.
   *
   * @param formId The form's internal ID
   * @param excludeRevId The revision ID to exclude from archiving
   * @param tx Optional transaction client
   */
  async archiveActiveRevisions(
    formId: number,
    excludeRevId: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.formRevision.updateMany({
      where: {
        form_id: formId,
        id: { not: excludeRevId },
        state: RevisionState.ACTIVE,
      },
      data: { state: RevisionState.ARCHIVED },
    });
  }

  /**
   * Find active form schema by form's internal ID
   * @param formId - The form's internal ID (not public_id)
   * @returns The form schema of the active revision if found, null otherwise
   */
  async findActiveFormSchema(formId: number): Promise<FormSchema | null> {
    const revision = await this.prisma.formRevision.findFirst({
      where: {
        form_id: formId,
        state: RevisionState.ACTIVE,
      },
      select: {
        form_schema: true,
      },
    });

    return revision ? (revision.form_schema as unknown as FormSchema) : null;
  }

  async findPermissionsByFormId(
    formId: number,
  ): Promise<Prisma.FormPermissionGetPayload<object>[]> {
    return this.prisma.formPermission.findMany({
      where: { form_id: formId },
    });
  }

  async findPermissionById(
    id: number,
  ): Promise<FormPermissionWithRelations | null> {
    return this.prisma.formPermission.findUnique({
      where: { id },
      include: { form: { include: { permissions: true } } },
    });
  }

  async createPermissions(
    formId: number,
    data: Prisma.FormPermissionCreateWithoutFormInput[],
  ): Promise<Prisma.FormPermissionGetPayload<object>[]> {
    const normalizedData = PermissionBuilderService.normalizePermissions(data);

    return this.prisma.$transaction(
      normalizedData.map((p) =>
        this.prisma.formPermission.create({
          data: {
            ...p,
            form_id: formId,
          },
        }),
      ),
    );
  }

  async deletePermission(
    id: number,
  ): Promise<Prisma.FormPermissionGetPayload<object>> {
    return this.prisma.formPermission.delete({
      where: { id },
    });
  }

  async deletePermissionsByQuery(
    formId: number,
    query: {
      grantee_type?: string;
      grantee_value?: string;
      action?: string;
    },
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.formPermission.deleteMany({
      where: {
        form_id: formId,
        ...query,
      } as Prisma.FormPermissionWhereInput,
    });
  }

  async setPermissions(
    formId: number,
    data: Prisma.FormPermissionCreateWithoutFormInput[],
  ): Promise<Prisma.FormPermissionGetPayload<object>[]> {
    const normalizedData = PermissionBuilderService.normalizePermissions(data);

    return this.prisma.$transaction(async (tx) => {
      await tx.formPermission.deleteMany({
        where: { form_id: formId },
      });

      return Promise.all(
        normalizedData.map((p) =>
          tx.formPermission.create({
            data: {
              ...p,
              form_id: formId,
            },
          }),
        ),
      );
    });
  }
}
