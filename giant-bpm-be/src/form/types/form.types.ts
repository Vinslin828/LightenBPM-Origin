import {
  Form,
  FormOptions,
  FormRevision,
  FormTag,
  Tag,
  WorkflowTag,
} from '../../common/types/common.types';

export type FormTagDetail = FormTag & {
  tag: Tag;
};

export type WorkflowTagDetail = WorkflowTag & {
  tag: Tag;
};

export type FormRevisionWithOptions = FormRevision & {
  options: FormOptions | null;
};

export type FormWithRevision = Form & {
  form_revisions?: FormRevisionWithOptions[];
} & {
  form_tag: FormTagDetail[];
};
