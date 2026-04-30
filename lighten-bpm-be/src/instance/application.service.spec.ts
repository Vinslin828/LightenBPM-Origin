/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './repositories/application.repository';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { ApprovalTaskRepository } from './repositories/approval-task.repository';
import { RoutingBuilder } from '../flow-engine/routing-builder/routing-builder';
import { FlowAnalysisService } from '../flow-engine/analysis/flow-analysis.service';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { FormInstanceRepository } from './repositories/form-instance.repository';
import { WorkflowNodeRepository } from './repositories/workflow-node.repository';
import { InstanceShareRepository } from './repositories/instance-share.repository';
import { ApplicationInstanceDto } from './dto/application.dto';
import { InstanceDataService } from './instance-data.service';
import {
  FormSchemaResolverService,
  ExpressionEvaluatorService,
} from '../flow-engine/expression-engine';
import { ValidationExecutorService } from '../flow-engine/expression-engine/services/validation-executor.service';
import { AuthUser } from '../auth/types/auth-user';
import {
  ApplicationsFilterEnum,
  ListApplicationsQueryDto,
} from './dto/list-applications-query.dto';
import { NodeType, ApprovalMethod, ApproverType } from '../flow-engine/types';
import { InstanceStatus } from '../common/types/common.types';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let applicationRepository: ApplicationRepository;
  let permissionBuilder: PermissionBuilderService;
  let instanceDataService: InstanceDataService;
  let workflowInstanceRepository: WorkflowInstanceRepository;
  let workflowNodeRepository: WorkflowNodeRepository;
  let instanceShareRepository: InstanceShareRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ApplicationRepository,
          useValue: {
            listApprovingApplicationInstances: jest.fn(),
            listSubmittedApplicationInstances: jest.fn(),
            createApplicationInstance: jest.fn(),
          },
        },
        {
          provide: PermissionBuilderService,
          useValue: {
            getInstanceVisibilityWhere: jest.fn().mockReturnValue({}),
            getWorkflowUsageWhere: jest.fn().mockReturnValue({}),
            canPerformAction: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: WorkflowInstanceRepository,
          useValue: {
            findBySerialNumber: jest.fn(),
            findBySerialNumberWithRevision: jest.fn(),
            generateSerialNumber: jest.fn(),
            createWithRelations: jest.fn(),
          },
        },
        {
          provide: InstanceShareRepository,
          useValue: {
            create: jest.fn(),
            findManyByInstanceId: jest.fn(),
          },
        },
        {
          provide: InstanceDataService,
          useValue: {
            isUserInvolvedAsApprover: jest.fn(),
            createFormInstanceSnapshot: jest.fn(),
            updateWorkflowInstanceWithEvent: jest.fn(),
          },
        },
        { provide: ApprovalTaskRepository, useValue: {} },
        { provide: RoutingBuilder, useValue: {} },
        { provide: FlowAnalysisService, useValue: {} },
        {
          provide: FormInstanceRepository,
          useValue: { createWithRelations: jest.fn() },
        },
        {
          provide: WorkflowNodeRepository,
          useValue: {
            findBySerialNumberWithTasks: jest.fn(),
          },
        },
        { provide: FormSchemaResolverService, useValue: {} },
        {
          provide: ExpressionEvaluatorService,
          useValue: { evaluate: jest.fn() },
        },
        {
          provide: ValidationExecutorService,
          useValue: { executeForFields: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    applicationRepository = module.get<ApplicationRepository>(
      ApplicationRepository,
    );
    permissionBuilder = module.get<PermissionBuilderService>(
      PermissionBuilderService,
    );
    instanceDataService = module.get<InstanceDataService>(InstanceDataService);
    workflowInstanceRepository = module.get<WorkflowInstanceRepository>(
      WorkflowInstanceRepository,
    );
    workflowNodeRepository = module.get<WorkflowNodeRepository>(
      WorkflowNodeRepository,
    );
    instanceShareRepository = module.get<InstanceShareRepository>(
      InstanceShareRepository,
    );
  });

  describe('listApplications', () => {
    const user = { id: 1 } as AuthUser;

    it('should use strict applicant_id filter for SUBMITTED filter', async () => {
      const query: ListApplicationsQueryDto = {
        filter: ApplicationsFilterEnum.SUBMITTED,
      };
      await service.listApplications(user, query);

      expect(
        applicationRepository.listSubmittedApplicationInstances as jest.Mock,
      ).toHaveBeenCalledWith(user.id, query, { applicant_id: user.id });
    });

    it('should use broad visibility filter for VISIBLE filter', async () => {
      const query: ListApplicationsQueryDto = {
        filter: ApplicationsFilterEnum.VISIBLE,
      };
      const visibilityWhere = { OR: [{ applicant_id: 1 }] };
      (
        permissionBuilder.getInstanceVisibilityWhere as jest.Mock
      ).mockReturnValue(visibilityWhere);

      await service.listApplications(user, query);

      expect(
        applicationRepository.listSubmittedApplicationInstances as jest.Mock,
      ).toHaveBeenCalledWith(user.id, query, visibilityWhere);
    });

    it('should call listApprovingApplicationInstances for APPROVING filter', async () => {
      const query: ListApplicationsQueryDto = {
        filter: ApplicationsFilterEnum.APPROVING,
      };
      await service.listApplications(user, query);

      expect(
        applicationRepository.listApprovingApplicationInstances as jest.Mock,
      ).toHaveBeenCalledWith(user.id, query);
    });
  });

  describe('createInstanceShare permissions', () => {
    const serialNumber = 'SN-1';
    const instance = { id: 1, applicant_id: 10 };
    const shareDto = { user_id: 20, reason: 'test' };

    beforeEach(() => {
      (
        workflowInstanceRepository.findBySerialNumber as jest.Mock
      ).mockResolvedValue(instance);
    });

    it('should allow admin to share', async () => {
      const user = { id: 99, bpmRole: 'admin' } as AuthUser;
      await service.createInstanceShare(serialNumber, shareDto, user);
      expect(instanceShareRepository.create).toHaveBeenCalled();
    });

    it('should allow applicant to share', async () => {
      const user = { id: 10, bpmRole: 'user' } as AuthUser;
      await service.createInstanceShare(serialNumber, shareDto, user);
      expect(instanceShareRepository.create).toHaveBeenCalled();
    });

    it('should allow involved approver to share', async () => {
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      (
        instanceDataService.isUserInvolvedAsApprover as jest.Mock
      ).mockResolvedValue(true);

      await service.createInstanceShare(serialNumber, shareDto, user);

      expect(instanceDataService.isUserInvolvedAsApprover).toHaveBeenCalledWith(
        instance.id,
        user.id,
      );
      expect(instanceShareRepository.create).toHaveBeenCalled();
    });

    it('should forbid others from sharing', async () => {
      const user = { id: 25, bpmRole: 'user' } as AuthUser;
      (
        instanceDataService.isUserInvolvedAsApprover as jest.Mock
      ).mockResolvedValue(false);

      await expect(
        service.createInstanceShare(serialNumber, shareDto, user),
      ).rejects.toThrow(
        'Only the applicant, admin, or involved approvers can manage shares for this instance',
      );
    });
  });

  describe('listInstanceShares', () => {
    it('should return aggregated instance shares', async () => {
      const serialNumber = 'SN-1';
      const user = { id: 10, bpmRole: 'user' } as AuthUser;
      const instance = { id: 1, applicant_id: 10 };
      const mockShares = [
        {
          id: 1,
          user_id: 20,
          workflow_instance_id: 1,
          permission: 'VIEW',
          reason: 'reason 1',
          created_by: 10,
          created_at: new Date(),
        },
        {
          id: 2,
          user_id: 20,
          workflow_instance_id: 1,
          permission: 'VIEW',
          reason: 'reason 2',
          created_by: 11,
          created_at: new Date(),
        },
      ];

      (
        workflowInstanceRepository.findBySerialNumber as jest.Mock
      ).mockResolvedValue(instance);
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValue(mockShares);

      const result = await service.listInstanceShares(serialNumber, user);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(20);
      expect(result[0].shares).toHaveLength(2);
      expect(result[0].shares[0].reason).toBe('reason 1');
      expect(result[0].shares[1].reason).toBe('reason 2');
    });
  });

  // ===========================================================================
  // getApplicationInstanceWithRules
  // ===========================================================================

  describe('getApplicationInstanceWithRules', () => {
    const serialNumber = 'SN-1';

    // Default approver user id used in tests — createMockAppInstance builds
    // approval tasks assigned to this id so the approver code path can
    // populate myApproverGroups.
    const APPROVER_USER_ID = 15;

    const createMockAppInstance = (
      nodeKeys: string[] = [],
      formSchema?: object,
      formData?: object,
      status: string = InstanceStatus.RUNNING,
    ): ApplicationInstanceDto =>
      ({
        serial_number: serialNumber,
        workflow_instance: { id: 'wi-1', applicant: { id: 10 }, status },
        workflow_nodes: nodeKeys.map((key) => ({
          node_key: key,
          approvals: [
            {
              assignee_id: APPROVER_USER_ID,
              approver_group_index: 0,
            },
          ],
        })),
        form_instance: {
          revision: {
            form_schema: formSchema || {
              root: ['uuid-1', 'uuid-2'],
              entities: {
                'uuid-1': { type: 'number', attributes: { name: 'amount' } },
                'uuid-2': { type: 'text', attributes: { name: 'reason' } },
              },
            },
          },
          form_data: formData || { amount: 1000, reason: 'test' },
        },
      }) as unknown as ApplicationInstanceDto;

    const createFlowDefinition = (nodes: any[]) => ({
      version: 1,
      nodes,
    });

    const createApprovalNode = (
      key: string,
      componentRules?: { component_name: string; actions: string[] }[],
    ) => ({
      key,
      type: NodeType.APPROVAL,
      next: 'end',
      approval_method: ApprovalMethod.SINGLE,
      approvers: {
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1] },
        component_rules: componentRules,
      },
    });

    it('should set all readonly true and not filter hidden when user is admin', async () => {
      // Arrange
      const adminUser = { id: 99, bpmRole: 'admin' } as AuthUser;
      const appInstance = createMockAppInstance(
        ['node_a'],
        undefined,
        undefined,
      );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            createApprovalNode('node_a', [
              { component_name: 'amount', actions: ['hide'] },
            ]),
          ]),
        },
      });

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        adminUser,
      );

      // Assert — admin should NOT have hidden fields filtered, but ALL readonly
      expect(result.form_instance.form_data).toEqual({
        amount: 1000,
        reason: 'test',
      });
      const entities = (
        result.form_instance.revision.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(true);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });

    it('should filter hidden components when approver views form', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance(['node_a']);
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      const workflowInstanceMock = {
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            createApprovalNode('node_a', [
              { component_name: 'amount', actions: ['hide'] },
            ]),
          ]),
        },
      };
      (workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock)
        .mockResolvedValueOnce(workflowInstanceMock)
        .mockResolvedValueOnce(workflowInstanceMock);
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        user,
      );

      // Assert
      expect(result.form_instance.form_data).toEqual({ reason: 'test' });
      expect(
        (result.form_instance.revision.form_schema as { root: string[] }).root,
      ).toEqual(['uuid-2']);
    });

    it('should not filter when applicant shared to user', async () => {
      // Arrange
      const sharedUser = { id: 30, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance([]);
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            createApprovalNode('node_a', [
              { component_name: 'amount', actions: ['hide'] },
            ]),
          ]),
        },
      });
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([
        { user_id: 30, created_by: 10 }, // shared by applicant (id=10)
      ]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        sharedUser,
      );

      // Assert
      expect(result.form_instance.form_data).toEqual({
        amount: 1000,
        reason: 'test',
      });
    });

    it('should filter based on sharer node when approver shared to user', async () => {
      // Arrange
      const sharedUser = { id: 30, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance([]);
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      const workflowInstanceMock = {
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            createApprovalNode('node_a', [
              { component_name: 'amount', actions: ['hide'] },
            ]),
          ]),
        },
      };
      (workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock)
        .mockResolvedValueOnce(workflowInstanceMock)
        .mockResolvedValueOnce(workflowInstanceMock);
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([
        { user_id: 30, created_by: 15 }, // shared by approver (id=15)
      ]);
      (
        workflowNodeRepository.findBySerialNumberWithTasks as jest.Mock
      ).mockResolvedValueOnce([
        {
          node_key: 'node_a',
          approval_tasks: [
            { assignee_id: 15, escalated_to: null, approver_group_index: 0 },
          ],
        },
      ]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        sharedUser,
      );

      // Assert
      expect(result.form_instance.form_data).toEqual({ reason: 'test' });
    });

    it('should use visible union when user has multiple nodes with different rules', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance(
        ['node_a', 'node_b'],
        {
          root: ['uuid-1', 'uuid-2', 'uuid-3'],
          entities: {
            'uuid-1': { type: 'number', attributes: { name: 'amount' } },
            'uuid-2': { type: 'text', attributes: { name: 'reason' } },
            'uuid-3': { type: 'text', attributes: { name: 'department' } },
          },
        },
        { amount: 1000, reason: 'test', department: 'IT' },
      );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      const workflowInstanceMock = {
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            createApprovalNode('node_a', [
              { component_name: 'amount', actions: ['hide'] },
              { component_name: 'reason', actions: ['hide'] },
            ]),
            createApprovalNode('node_b', [
              { component_name: 'reason', actions: ['hide'] },
              { component_name: 'department', actions: ['hide'] },
            ]),
          ]),
        },
      };
      (workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock)
        .mockResolvedValueOnce(workflowInstanceMock)
        .mockResolvedValueOnce(workflowInstanceMock);
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        user,
      );

      // Assert — only 'reason' hidden in both nodes (intersection)
      expect(result.form_instance.form_data).toEqual({
        amount: 1000,
        department: 'IT',
      });
    });

    it('should set all readonly true when non-draft approver views form', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance(
        ['node_a'],
        undefined,
        undefined,
        InstanceStatus.RUNNING,
      );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      const workflowInstanceMock = {
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([createApprovalNode('node_a')]),
        },
      };
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce(workflowInstanceMock);
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        user,
      );

      // Assert
      const entities = (
        result.form_instance.revision.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(true);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });

    it('should apply editable mode when applicant views draft', async () => {
      // Arrange — user is applicant (id matches applicant_id)
      const user = { id: 10, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance(
        [],
        undefined,
        undefined,
        InstanceStatus.DRAFT,
      );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([
            {
              key: 'start',
              type: NodeType.START,
              next: 'node_a',
              component_rules: [
                { component_name: 'amount', actions: ['editable'] },
              ],
            },
            createApprovalNode('node_a'),
          ]),
        },
      });
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        user,
      );

      // Assert — EDITABLE mode: editable components → readonly: false, others → readonly: true
      const entities = (
        result.form_instance.revision.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(false);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });

    it('should set all readonly true when applicant shared to user on non-draft', async () => {
      // Arrange
      const sharedUser = { id: 30, bpmRole: 'user' } as AuthUser;
      const appInstance = createMockAppInstance(
        [],
        undefined,
        undefined,
        InstanceStatus.RUNNING,
      );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: createFlowDefinition([]),
        },
      });
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([
        { user_id: 30, created_by: 10 }, // shared by applicant
      ]);

      // Act
      const result = await service.getApplicationInstanceWithRules(
        serialNumber,
        sharedUser,
      );

      // Assert
      const entities = (
        result.form_instance.revision.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(true);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });
  });

  // ===========================================================================
  // getApprovalDetailWithRules
  // ===========================================================================

  describe('getApprovalDetailWithRules', () => {
    const serialNumber = 'SN-1';

    const createMockApprovalDetail = () => ({
      serialNumber: serialNumber,
      approvalTask: {
        id: 'task-1',
        assignee_id: 15,
        status: 'PENDING',
        approver_group_index: 0,
      },
      workflowNode: {
        id: 'wn-1',
        node_key: 'node_a',
        approval_tasks: [],
      },
      comments: [],
    });

    const createMockAppInstanceForApproval = (
      formSchema?: object,
      formData?: object,
    ) =>
      ({
        serial_number: serialNumber,
        workflow_instance: {
          id: 'wi-1',
          applicant: { id: 10 },
          revision: { name: 'Test', description: null },
          status: InstanceStatus.RUNNING,
          priority: 'NORMAL',
          createdAt: new Date(),
          appliedAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        },
        form_instance: {
          id: 'fi-1',
          revision: {
            name: 'Form',
            description: null,
            form_schema: formSchema || {
              root: ['uuid-1', 'uuid-2'],
              entities: {
                'uuid-1': {
                  type: 'number',
                  attributes: { name: 'amount' },
                },
                'uuid-2': {
                  type: 'text',
                  attributes: { name: 'reason' },
                },
              },
            },
          },
          form_data: formData || { amount: 1000, reason: 'test' },
        },
      }) as unknown as ApplicationInstanceDto;

    it('should apply editable readonly mode when non-admin approver views approval', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const approvalDetail = createMockApprovalDetail();
      const appInstance = createMockAppInstanceForApproval();
      jest
        .spyOn(service, 'getApprovalDetail')
        .mockResolvedValueOnce(
          approvalDetail as unknown as Awaited<
            ReturnType<typeof service.getApprovalDetail>
          >,
        );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        revision: {
          flow_definition: {
            version: 1,
            nodes: [
              {
                key: 'node_a',
                type: NodeType.APPROVAL,
                next: 'end',
                approval_method: ApprovalMethod.SINGLE,
                approvers: {
                  type: ApproverType.SPECIFIC_USERS,
                  config: { user_ids: [15] },
                  component_rules: [
                    { component_name: 'amount', actions: ['editable'] },
                  ],
                },
              },
            ],
          },
        },
      });

      // Act
      const result = await service.getApprovalDetailWithRules('task-1', user);

      // Assert
      const entities = (
        result.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(false);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });

    it('should hide component and set readonly on remaining when approval node has both rules', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const approvalDetail = createMockApprovalDetail();
      const appInstance = createMockAppInstanceForApproval();
      jest
        .spyOn(service, 'getApprovalDetail')
        .mockResolvedValueOnce(
          approvalDetail as unknown as Awaited<
            ReturnType<typeof service.getApprovalDetail>
          >,
        );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        revision: {
          flow_definition: {
            version: 1,
            nodes: [
              {
                key: 'node_a',
                type: NodeType.APPROVAL,
                next: 'end',
                approval_method: ApprovalMethod.SINGLE,
                approvers: {
                  type: ApproverType.SPECIFIC_USERS,
                  config: { user_ids: [15] },
                  component_rules: [
                    { component_name: 'amount', actions: ['hide'] },
                    { component_name: 'reason', actions: ['editable'] },
                  ],
                },
              },
            ],
          },
        },
      });

      // Act
      const result = await service.getApprovalDetailWithRules('task-1', user);

      // Assert
      const entities = (
        result.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1']).toBeUndefined();
      expect(entities['uuid-2'].attributes.readonly).toBe(false);
      expect(result.form_data).toEqual({ reason: 'test' });
    });

    it('should set disable true on disable components and false on others when approval node has disable rules', async () => {
      // Arrange
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const approvalDetail = createMockApprovalDetail();
      const appInstance = createMockAppInstanceForApproval();
      jest
        .spyOn(service, 'getApprovalDetail')
        .mockResolvedValueOnce(
          approvalDetail as unknown as Awaited<
            ReturnType<typeof service.getApprovalDetail>
          >,
        );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        revision: {
          flow_definition: {
            version: 1,
            nodes: [
              {
                key: 'node_a',
                type: NodeType.APPROVAL,
                next: 'end',
                approval_method: ApprovalMethod.SINGLE,
                approvers: {
                  type: ApproverType.SPECIFIC_USERS,
                  config: { user_ids: [15] },
                  component_rules: [
                    { component_name: 'amount', actions: ['editable'] },
                    { component_name: 'reason', actions: ['disabled'] },
                  ],
                },
              },
            ],
          },
        },
      });

      // Act
      const result = await service.getApprovalDetailWithRules('task-1', user);

      // Assert
      const entities = (
        result.form_schema as {
          entities: Record<
            string,
            { attributes: { readonly?: boolean; disabled?: boolean } }
          >;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(false);
      expect(entities['uuid-1'].attributes.disabled).toBe(false);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
      expect(entities['uuid-2'].attributes.disabled).toBe(true);
    });

    it('should fall back to APPROVER ruleset (all readonly) when task is no longer PENDING', async () => {
      // Arrange — same approver as before but their task is APPROVED, so the
      // approval-detail endpoint should drop APPROVER_ACTIVE and apply the
      // historical APPROVER role (editableNames=[]).
      const user = { id: 15, bpmRole: 'user' } as AuthUser;
      const approvalDetail = createMockApprovalDetail();
      approvalDetail.approvalTask.status = 'APPROVED';
      const appInstance = createMockAppInstanceForApproval();
      // workflow_nodes drives determineViewerRole; include the approved task
      // so the user is recognised as an approver of node_a.
      (appInstance as unknown as { workflow_nodes: unknown[] }).workflow_nodes =
        [
          {
            node_key: 'node_a',
            approvals: [
              {
                assignee_id: 15,
                approver_group_index: 0,
                status: 'APPROVED',
              },
            ],
          },
        ];
      jest
        .spyOn(service, 'getApprovalDetail')
        .mockResolvedValueOnce(
          approvalDetail as unknown as Awaited<
            ReturnType<typeof service.getApprovalDetail>
          >,
        );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        id: 1,
        applicant_id: 10,
        revision: {
          flow_definition: {
            version: 1,
            nodes: [
              {
                key: 'node_a',
                type: NodeType.APPROVAL,
                next: 'end',
                approval_method: ApprovalMethod.SINGLE,
                approvers: {
                  type: ApproverType.SPECIFIC_USERS,
                  config: { user_ids: [15] },
                  component_rules: [
                    { component_name: 'amount', actions: ['editable'] },
                  ],
                },
              },
            ],
          },
        },
      });
      (
        instanceShareRepository.findManyByInstanceId as jest.Mock
      ).mockResolvedValueOnce([]);

      // Act
      const result = await service.getApprovalDetailWithRules('task-1', user);

      // Assert — editable rule on the approval node MUST NOT apply once task
      // is closed; both fields should be readonly.
      const entities = (
        result.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(true);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });

    it('should still apply node rules when admin views approval', async () => {
      // Arrange
      const adminUser = { id: 99, bpmRole: 'admin' } as AuthUser;
      const approvalDetail = createMockApprovalDetail();
      const appInstance = createMockAppInstanceForApproval();
      jest
        .spyOn(service, 'getApprovalDetail')
        .mockResolvedValueOnce(
          approvalDetail as unknown as Awaited<
            ReturnType<typeof service.getApprovalDetail>
          >,
        );
      jest
        .spyOn(service, 'getApplicationInstance')
        .mockResolvedValueOnce(appInstance);
      (
        workflowInstanceRepository.findBySerialNumberWithRevision as jest.Mock
      ).mockResolvedValueOnce({
        revision: {
          flow_definition: {
            version: 1,
            nodes: [
              {
                key: 'node_a',
                type: NodeType.APPROVAL,
                next: 'end',
                approval_method: ApprovalMethod.SINGLE,
                approvers: {
                  type: ApproverType.SPECIFIC_USERS,
                  config: { user_ids: [99] },
                  component_rules: [
                    { component_name: 'amount', actions: ['editable'] },
                  ],
                },
              },
            ],
          },
        },
      });

      // Act
      const result = await service.getApprovalDetailWithRules(
        'task-1',
        adminUser,
      );

      // Assert
      const entities = (
        result.form_schema as {
          entities: Record<string, { attributes: { readonly?: boolean } }>;
        }
      ).entities;
      expect(entities['uuid-1'].attributes.readonly).toBe(false);
      expect(entities['uuid-2'].attributes.readonly).toBe(true);
    });
  });

  // ===========================================================================
  // createInstanceData — auto-share on behalf submission
  // ===========================================================================

  describe('createInstanceData (auto-share on behalf submission)', () => {
    const formRevision = { id: 1 } as never;
    const workflowRevision = { id: 2, workflow_id: 3 } as never;
    const formData = { foo: 'bar' } as never;
    const priority = 'NORMAL' as never;

    beforeEach(() => {
      (
        workflowInstanceRepository.generateSerialNumber as jest.Mock
      ).mockResolvedValue('SN-2026-0001');
      (
        workflowInstanceRepository.createWithRelations as jest.Mock
      ).mockResolvedValue({ id: 100, serial_number: 'SN-2026-0001' });
      (
        service as unknown as {
          formInstanceRepository: { createWithRelations: jest.Mock };
        }
      ).formInstanceRepository.createWithRelations // FormInstanceRepository.createWithRelations
        .mockResolvedValue({ id: 200 });
    });

    it('should create an auto-share to submitter when applicantId differs from submitterId', async () => {
      // Arrange
      const applicantId = 10;
      const submitterId = 99;

      // Act
      await service.createInstanceData(
        formRevision,
        formData,
        workflowRevision,
        applicantId,
        submitterId,
        priority,
      );

      // Assert
      expect(instanceShareRepository.create).toHaveBeenCalledWith(
        {
          workflow_instance_id: 100,
          user_id: submitterId,
          permission: 'VIEW',
          reason: 'Auto-shared on behalf submission',
          created_by: applicantId,
        },
        undefined,
      );
    });

    it('should NOT create an auto-share when applicantId equals submitterId', async () => {
      // Act
      await service.createInstanceData(
        formRevision,
        formData,
        workflowRevision,
        50,
        50,
        priority,
      );

      // Assert
      expect(instanceShareRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate the transaction client to the share create call', async () => {
      // Arrange
      const tx = { mock: 'tx' } as never;

      // Act
      await service.createInstanceData(
        formRevision,
        formData,
        workflowRevision,
        10,
        99,
        priority,
        tx,
      );

      // Assert
      expect(instanceShareRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 99, created_by: 10 }),
        tx,
      );
    });
  });
});
