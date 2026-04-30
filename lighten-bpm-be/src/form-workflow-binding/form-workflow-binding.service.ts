import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FormWorkflowBindingDto } from './dto/form-workflow-binding.dto';
import { CreateFormWorkflowBindingDto } from './dto/create-form-workflow-binding.dto';
import { CreateFormWorkflowBindingResponseDto } from './dto/create-form-workflow-binding-response';
import { TagDto } from '../tag/dto/tag.dto';
import { toFormRevisionWithTagsDto } from '../form/dto/form-revision-with-tags.dto';
import { FormWorkflowBindingRepository } from './repositories/form-workflow-binding.repository';
import { FormWorkflowBinding } from '../form/types/application-binding.types';
import { FormWithRevision } from '../form/types/form.types';

@Injectable()
export class FormWorkflowBindingService {
  private readonly debugging = false;
  private readonly logger = new Logger(FormWorkflowBindingService.name);
  constructor(private readonly repository: FormWorkflowBindingRepository) {}

  async create(
    createDto: CreateFormWorkflowBindingDto,
    userId: number,
  ): Promise<CreateFormWorkflowBindingResponseDto> {
    const form = await this.repository.findFormWithRevisionsAndTags(
      createDto.form_id,
    );
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const workflow = await this.repository.findWorkflowByPublicId(
      createDto.workflow_id,
    );
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if this exact binding already exists to prevent duplicates
    const existingBinding = await this.repository.findExistingBinding(
      form.id,
      workflow.id,
    );

    const formRev = form.form_revisions[0];
    const tags = form.form_tag.map((ft) => TagDto.fromPrisma(ft.tag));
    if (!formRev.options) {
      throw new InternalServerErrorException('invalid form revision data!');
    }
    const revisionResponse = toFormRevisionWithTagsDto(
      form.public_id,
      formRev,
      formRev.options,
      tags,
    );
    if (existingBinding) {
      return {
        id: existingBinding.id,
        form_id: existingBinding.form.public_id,
        workflow_id: existingBinding.workflow.public_id,
        formRevision: revisionResponse,
      };
    }

    if (this.debugging) {
      this.logger.debug(
        `check existing bindings for workflow ${workflow.public_id}`,
      );
      // NOTE: findMany logic moved to repository, but here debugging log was using direct prisma.
      // We can use repository findMany if we implement filtering by workflow_id
      const bindings = await this.repository.findMany({
        workflow_id: workflow.id,
      });
      this.logger.debug(`existing bindings: ${JSON.stringify(bindings)}`);
    }

    //make sure the workflow and form each have only one active binding
    const deletedByWorkflow = await this.repository.deleteByWorkflowId(
      workflow.id,
    );
    if (deletedByWorkflow.count > 0) {
      this.logger.log(
        `Deleted ${deletedByWorkflow.count} existing bindings for workflow ${workflow.public_id}`,
      );
    }
    const deletedByForm = await this.repository.deleteByFormId(form.id);
    if (deletedByForm.count > 0) {
      this.logger.log(
        `Deleted ${deletedByForm.count} existing bindings for form ${form.public_id}`,
      );
    }

    // Create a new binding if none exists for this pair
    const createdBinding = await this.repository.create({
      form_id: form.id,
      workflow_id: workflow.id,
      created_by: userId,
      updated_by: userId,
    });
    return {
      id: createdBinding.id,
      form_id: form.public_id,
      workflow_id: workflow.public_id,
      formRevision: revisionResponse,
    };
  }

  async find(
    formId?: string,
    workflowId?: string,
  ): Promise<FormWorkflowBindingDto[]> {
    const bindings = await this.repository.findMany({
      ...(formId && { form: { public_id: formId } }),
      ...(workflowId && { workflow: { public_id: workflowId } }),
    });

    // Filter out bindings with missing relations before mapping
    const validBindings = bindings.filter((b) => b.form && b.workflow);

    if (!validBindings || validBindings.length == 0) {
      // Only throw 404 if a filter was actually provided.
      // If no filter, return empty array.
      if (formId || workflowId) {
        throw new NotFoundException('Form binding not found');
      } else {
        return []; // Return empty array for "list all" if nothing is found
      }
    }
    return validBindings.map(
      (b) =>
        new FormWorkflowBindingDto(
          b.id,
          b.form.public_id,
          b.workflow.public_id,
        ),
    );
  }

  async get(id: number): Promise<FormWorkflowBindingDto> {
    const bindings = await this.repository.findUnique(id);
    if (!bindings)
      throw new NotFoundException(`No Application Binding Found for ID: ${id}`);
    return new FormWorkflowBindingDto(
      bindings?.id,
      bindings?.form.public_id,
      bindings?.workflow.public_id,
    );
  }

  // --- Exposed for other Services (Refactoring Part 2) ---

  async getBinding(id: number): Promise<FormWorkflowBinding> {
    return this.repository.getBinding(id);
  }

  async getBindingFormByWorkflowId(
    workflowId: number,
  ): Promise<FormWithRevision | null> {
    return this.repository.getBindingFormByWorkflowId(workflowId);
  }

  async findFormIdByWorkflowPublicId(
    workflowPublicId: string,
  ): Promise<number | null> {
    return this.repository.findFormIdByWorkflowPublicId(workflowPublicId);
  }

  // -----------------------------------------------------

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
