import { User, ApprovalStatus } from '../../common/types/common.types';
import * as FlowEngineTypes from '../../flow-engine/types';

const sampleUser: User = {
  id: 123,
  code: 'D0001',
  sub: 'user_sub_123',
  email: 'john.doe@example.com',
  name: 'John Doe',
  job_grade: 5,
  lang: 'en',
  default_org_id: 1,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const sampleHead1: User = {
  id: 234,
  code: 'D0002',
  sub: 'user_sub_234',
  email: 'jason.doe@example.com',
  name: 'Jason Doe',
  job_grade: 10,
  lang: 'en',
  default_org_id: 1,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const sampleHead2: User = {
  id: 1,
  code: 'D0003',
  sub: 'user_sub_1',
  email: 'head.doe@example.com',
  name: 'head Doe',
  job_grade: 20,
  lang: 'en',
  default_org_id: 2,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

export const sampleRouting: FlowEngineTypes.FlowRouting = {
  serialNumber: 'APP-1701010100000',
  workflowInstanceId: 'clx1s2q5v000008l3g6yq9z7j',
  nodes: [
    {
      key: 'START',
      type: FlowEngineTypes.NodeType.START,
      status: FlowEngineTypes.RoutingNodeStatus.COMPLETED,
      desc: 'Start of the workflow',
      parent_keys: [],
      child_keys: ['condition_1'],
    },
    {
      key: 'condition_1',
      type: FlowEngineTypes.NodeType.CONDITION,
      status: FlowEngineTypes.RoutingNodeStatus.COMPLETED,
      desc: 'Check if amount > 1000',
      parent_keys: ['START'],
      child_keys: ['approval_1', 'approval_2'],
    },
    {
      key: 'approval_1',
      type: FlowEngineTypes.NodeType.APPROVAL,
      status: FlowEngineTypes.RoutingNodeStatus.PENDING,
      desc: 'Manager Approval',
      parent_keys: ['condition_1'],
      approvalMethod: FlowEngineTypes.ApprovalMethod.SINGLE,
      approvalGroups: [
        {
          isReportingLine: false,
          approvals: [
            {
              approvalTaskId: 'task_0001_sample_uuid',
              assignee: sampleUser,
              status: ApprovalStatus.PENDING,
            },
          ],
        },
      ],
    },
    {
      key: 'approval_2',
      type: FlowEngineTypes.NodeType.APPROVAL,
      status: FlowEngineTypes.RoutingNodeStatus.PENDING,
      desc: 'Line Approval',
      parent_keys: ['condition_1'],
      approvalMethod: FlowEngineTypes.ApprovalMethod.SINGLE,
      approvalGroups: [
        {
          isReportingLine: true,
          approvals: [
            {
              approvalTaskId: 'task_0002_sample_uuid',
              assignee: sampleHead1,
              status: ApprovalStatus.PENDING,
            },
            {
              approvalTaskId: 'task_0003_sample_uuid',
              assignee: sampleHead2,
              status: ApprovalStatus.WAITING,
            },
          ],
        },
      ],
    },
    {
      key: 'END',
      type: FlowEngineTypes.NodeType.END,
      status: FlowEngineTypes.RoutingNodeStatus.INACTIVE,
      desc: 'End of the workflow',
      parent_keys: ['approval_1'],
    },
  ],
};
