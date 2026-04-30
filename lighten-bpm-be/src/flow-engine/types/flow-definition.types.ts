import { Node } from './node.types';

export interface FlowDefinition {
  version: number;
  nodes: Node[];
}
