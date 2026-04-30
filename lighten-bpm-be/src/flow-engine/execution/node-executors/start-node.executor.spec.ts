/**
 * Unit Tests - Start Node Executor
 *
 * Test Structure:
 *   1. execute - START node execution
 */

import { StartNodeExecutor } from './start-node.executor';
import { NodeType } from '../../types';

describe('Start Node Executor - Unit Tests', () => {
  let executor: StartNodeExecutor;

  beforeEach(() => {
    executor = new StartNodeExecutor();
  });

  describe('execute', () => {
    it('should return next node key', () => {
      const nodeConfig = {
        key: 'start',
        type: NodeType.START,
        next: 'condition1',
      };

      const result = executor.execute(nodeConfig);

      expect(result).toEqual({
        nextNodeKey: 'condition1',
      });
    });

    it('should handle different next node keys', () => {
      const nodeConfig = {
        key: 'start',
        type: NodeType.START,
        next: 'approval1',
      };

      const result = executor.execute(nodeConfig);

      expect(result).toEqual({
        nextNodeKey: 'approval1',
      });
    });

    it('should handle end as next node', () => {
      const nodeConfig = {
        key: 'start',
        type: NodeType.START,
        next: 'end',
      };

      const result = executor.execute(nodeConfig);

      expect(result).toEqual({
        nextNodeKey: 'end',
      });
    });
  });
});
