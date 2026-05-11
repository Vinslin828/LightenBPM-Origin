import { FormStatus } from "@/types/form-builder";
import {
  FormListItemResponse,
  FormListResponse,
  FormResponse,
  FormRevisionResponse,
  ResolvedFormResponse,
} from "./response";
import { deparseFormSchema } from "@/utils/parser";
import { tTag } from "../master-data/transform";
import { FormDefinition, ResolvedFormDefinition } from "@/types/domain";
import { transformPaginatedResponse } from "../shared";

export function tFormStatusSchema(status: FormRevisionResponse["status"]) {
  switch (status) {
    case "ACTIVE":
      return FormStatus.Published;
    case "DRAFT":
      return FormStatus.Draft;
    case "ARCHIVED":
      return FormStatus.Archived;
    default:
      return FormStatus.Draft;
  }
}
export function tFormSchema(data: FormResponse) {
  const v = data.revision.validation;
  console.log("[tFormSchema] validation from API:", v);
  return {
    id: data.id,
    revisionId: data.revision.revision_id,
    name: data.revision.name,
    description: data.revision.description ?? "",
    schema: deparseFormSchema({
      root: data.revision.form_schema?.root ?? [],
      entities: data.revision.form_schema?.entities ?? {},
    }),
    version: data.revision.version,
    createdAt: data.revision.created_at,
    updatedAt: "",
    publishStatus: tFormStatusSchema(data.revision.status),
    tags: data.tags.map((tag) => tTag(tag)),
    validation: v
      ? { required: v.required, validators: v.validators }
      : { required: false, validators: [] },
    defaultLang: v?.defaultLang,
    translationLangs: v?.translationLangs,
    labelTranslations: v?.labelTranslations,
  } satisfies FormDefinition;
}

export function tFormRevisionSchema(revision: FormRevisionResponse) {
  const deparsedSchema = deparseFormSchema({
    root: revision.form_schema?.root ?? [],
    entities: revision.form_schema?.entities ?? {},
  });
  console.debug({ deparseForm: deparsedSchema });
  const v = revision.validation;
  return {
    id: revision.form_id,
    revisionId: revision.revision_id,
    name: revision.name,
    description: revision.description ?? "",
    schema: deparsedSchema,
    version: revision.version,
    createdAt: revision.created_at,
    updatedAt: "",
    publishStatus: tFormStatusSchema(revision.status),
    tags: [],
    validation: v
      ? { required: v.required, validators: v.validators }
      : { required: false, validators: [] },
    defaultLang: v?.defaultLang,
    translationLangs: v?.translationLangs,
    labelTranslations: v?.labelTranslations,
  } satisfies FormDefinition;
}
export function tFormListItemSchema(data: FormListItemResponse) {
  return {
    id: data.form_id,
    revisionId: data.form_revision_id,
    name: data.name,
    description: data.form_description ?? "",
    schema: {
      root: [],
      entities: {},
    },
    version: 1,
    createdAt: data.created_at,
    updatedAt: "",
    publishStatus: FormStatus.Published,
    tags: data.tags.map((tag) => tTag(tag)),
    validation: { required: false, validators: [] },
  } satisfies FormDefinition;
}
export function tFormListSchema(data: FormListResponse) {
  return transformPaginatedResponse(data, tFormListItemSchema);
}

export function tResolvedFormSchema(
  data: ResolvedFormResponse,
): ResolvedFormDefinition {
  return {
    id: data.id,
    revisionId: data.revisionId,
    name: data.name,
    description: data.description ?? "",
    formSchema: data.formSchema ?? { root: [], entities: {} },
    options: {
      canWithdraw: data.options.can_withdraw,
      canCopy: data.options.can_copy,
      canDraft: data.options.can_draft,
      canDelegate: data.options.can_delegate,
    },
    applicantSource: data.applicantSource,
  };
}

export function tResolvedToFormDefinition(
  data: ResolvedFormResponse,
): FormDefinition {
  return {
    id: data.id,
    revisionId: data.revisionId,
    name: data.name,
    description: data.description ?? "",
    schema: deparseFormSchema({
      root: data.formSchema?.root ?? [],
      entities: data.formSchema?.entities ?? {},
    }),
    version: 0,
    createdAt: "",
    updatedAt: "",
    publishStatus: FormStatus.Draft,
    tags: [],
    validation: { required: false, validators: [] },
    applicantSource: data.applicantSource,
  };
}
