import { RoutingNode } from './flow-routing-node.types';

export interface FlowRouting {
  serialNumber: string;
  workflowInstanceId: string;
  nodes: RoutingNode[];
}
