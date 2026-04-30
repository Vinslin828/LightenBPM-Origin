import { z } from 'zod';
import { NodeSchema } from './node.schema';
import { NodeType } from '../../../types';

/**
 * Flow Definition Schema
 *
 * Validates the complete flow definition structure.
 * Includes basic structure validation that applies to all versions.
 */

/**
 * V1 Flow Definition Schema
 *
 * Version 1 flow definition with all supported node types.
 */
const FlowDefinitionV1Schema = z
  .object({
    version: z.literal(1),
    nodes: z.array(NodeSchema),
  })
  .refine(
    (flow) => {
      // Must have exactly one START node
      const startNodes = flow.nodes.filter((n) => n.type === NodeType.START);
      return startNodes.length === 1;
    },
    {
      message: 'Flow must have exactly one START node',
      path: ['nodes'],
    },
  )
  .refine(
    (flow) => {
      // Must have exactly one END node
      const endNodes = flow.nodes.filter((n) => n.type === NodeType.END);
      return endNodes.length === 1;
    },
    {
      message: 'Flow must have exactly one END node',
      path: ['nodes'],
    },
  );

/**
 * Helper function to get schema by version
 */
export function getFlowDefinitionSchema(version: number) {
  switch (version) {
    case 1:
      return FlowDefinitionV1Schema;
    // case 2:
    //   return FlowDefinitionV2Schema;
    default:
      throw new Error(`Unsupported flow definition version: ${version}`);
  }
}
