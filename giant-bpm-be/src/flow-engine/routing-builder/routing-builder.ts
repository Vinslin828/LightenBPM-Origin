import { WorkflowInstanceDto } from 'src/instance/dto/workflow-instance.dto';
import { FlowRouting, FlowDefinition, RoutingNode, NodeType } from '../types';
import { WorkflowNodeDto } from 'src/instance/dto/workflow-node.dto';
import { Injectable } from '@nestjs/common';
import { RoutingNodeBuilder } from './routing-node-builder';
import { Node } from '../types';

export type FlowInstance = WorkflowInstanceDto & {
  nodes: WorkflowNodeDto[];
};

@Injectable()
export class RoutingBuilder {
  constructor(readonly routingNodeBuilder: RoutingNodeBuilder) {}

  // Implementation details would go here
  async build(
    serialNumber: string,
    instance: FlowInstance,
    formData: Record<string, any>,
    workflowInstanceId?: number,
  ): Promise<FlowRouting> {
    if (!instance.revision || !instance.revision.flow_definition) {
      throw new Error(
        'Invalid workflow instance: missing revision or flow definition',
      );
    }
    const flowDefinition: FlowDefinition = instance.revision.flow_definition;
    const nodeInstanceMap = new Map<string, WorkflowNodeDto>(
      instance.nodes.map((node) => [node.node_key, node]),
    );
    const nodeDefinitionMap = new Map<string, Node>(
      flowDefinition.nodes.map((node) => [node.key, node]),
    );

    const routingNodes = new Map<string, RoutingNode>();
    const queue: string[] = [];
    const visited = new Set<string>();

    const startNode = flowDefinition.nodes.find(
      (node) => node.type === NodeType.START,
    );
    if (!startNode) {
      throw new Error('Start node not found in flow definition');
    }

    queue.push(startNode.key);
    visited.add(startNode.key);

    while (queue.length > 0) {
      const currentNodeKey = queue.shift()!;
      const nodeDefinition = nodeDefinitionMap.get(currentNodeKey);

      if (!nodeDefinition) {
        continue;
      }

      const nodeInstance = nodeInstanceMap.get(currentNodeKey);

      const routingNode = await this.routingNodeBuilder.build(
        instance.status,
        [], // We will populate parent_keys later.
        instance.applicant.id,
        formData,
        nodeDefinition,
        nodeInstance,
        workflowInstanceId,
      );
      routingNodes.set(currentNodeKey, routingNode);

      const children = routingNode.child_keys ?? [];
      for (const childKey of children) {
        if (!visited.has(childKey)) {
          visited.add(childKey);
          queue.push(childKey);
        }
      }
    }

    // Populate parent_keys for each node
    for (const node of routingNodes.values()) {
      if (node.child_keys) {
        for (const childKey of node.child_keys) {
          const childNode = routingNodes.get(childKey);
          if (childNode) {
            childNode.parent_keys.push(node.key);
          }
        }
      }
    }

    return {
      serialNumber,
      workflowInstanceId: instance.id,
      nodes: Array.from(routingNodes.values()),
    };
  }
}
