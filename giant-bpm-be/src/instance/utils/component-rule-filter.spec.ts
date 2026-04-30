/**
 * Unit Tests - Component Rule Filter Utilities
 */

import {
  applyComponentRules,
  resolveComponentRules,
  ApproverGroupRef,
  VIEWER_ROLE,
} from './component-rule-filter';
import {
  FlowDefinition,
  NodeType,
  ApprovalMethod,
  ApproverType,
  FormSchema,
  SingleApprovalNode,
  ComponentRule,
  ComponentRuleAction,
} from '../../flow-engine/types';

type RuleInput = {
  component_name: string;
  actions: string[];
  condition?: string;
};

const toRules = (rules?: RuleInput[]): ComponentRule[] | undefined =>
  rules?.map((r) => ({
    component_name: r.component_name,
    actions: r.actions as ComponentRuleAction[],
    ...(r.condition !== undefined ? { condition: r.condition } : {}),
  }));

describe('component-rule-filter', () => {
  // ===========================================================================
  // resolveComponentRules
  // ===========================================================================

  describe('resolveComponentRules', () => {
    const createApprovalNode = (
      key: string,
      componentRules?: RuleInput[],
    ): SingleApprovalNode =>
      ({
        key,
        type: NodeType.APPROVAL,
        next: 'end',
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.SPECIFIC_USERS,
          config: { user_ids: [1] },
          ...(componentRules
            ? { component_rules: toRules(componentRules) }
            : {}),
        },
      }) as SingleApprovalNode;

    const createFlow = (
      startRules?: RuleInput[],
      approvalNodes?: SingleApprovalNode[],
    ): FlowDefinition => ({
      version: 1,
      nodes: [
        {
          key: 'start',
          type: NodeType.START,
          next: 'node_a',
          ...(startRules ? { component_rules: toRules(startRules) } : {}),
        } as FlowDefinition['nodes'][number],
        ...(approvalNodes || [createApprovalNode('node_a')]),
        { key: 'end', type: NodeType.END },
      ],
    });

    const resolveWithNodes = (
      flow: FlowDefinition,
      role: (typeof VIEWER_ROLE)[keyof typeof VIEWER_ROLE],
      nodeKeys: string[] = [],
    ) => {
      const groups: ApproverGroupRef[] = nodeKeys.map((nodeKey) => ({
        nodeKey,
        groupIndex: 0,
      }));
      return resolveComponentRules(flow, role, groups);
    };

    // =========================================================================
    // role: admin
    // =========================================================================

    it('should return no hide and no editable when role is admin', () => {
      // Arrange
      const flow = createFlow(
        [
          { component_name: 'amount', actions: ['hide'] },
          { component_name: 'reason', actions: ['disabled'] },
        ],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.ADMIN);

      // Assert
      expect(result.hiddenNames).toEqual([]);
      expect(result.editableNames).toEqual([]);
      expect(result.disableNames).toEqual(['reason']);
    });

    it('should return start node required when role is admin', () => {
      // Arrange
      const flow = createFlow([
        { component_name: 'amount', actions: ['required'] },
      ]);

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.ADMIN);

      // Assert
      expect(result.requiredNames).toEqual(['amount']);
    });

    // =========================================================================
    // role: applicant_draft
    // =========================================================================

    it('should return start node hide, editable, and disable when role is applicant_draft', () => {
      // Arrange
      const flow = createFlow([
        { component_name: 'amount', actions: ['hide'] },
        { component_name: 'reason', actions: ['editable'] },
        { component_name: 'department', actions: ['disabled'] },
      ]);

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPLICANT_DRAFT);

      // Assert
      expect(result.hiddenNames).toEqual(['amount']);
      expect(result.editableNames).toEqual(['reason']);
      expect(result.disableNames).toEqual(['department']);
    });

    it('should return start node required when role is applicant_draft', () => {
      // Arrange
      const flow = createFlow([
        { component_name: 'amount', actions: ['editable', 'required'] },
        { component_name: 'reason', actions: ['required'] },
      ]);

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPLICANT_DRAFT);

      // Assert
      expect(result.requiredNames).toEqual(
        expect.arrayContaining(['amount', 'reason']),
      );
      expect(result.requiredNames).toHaveLength(2);
    });

    // =========================================================================
    // role: applicant
    // =========================================================================

    it('should return start node hide with no editable when role is applicant', () => {
      // Arrange
      const flow = createFlow([
        { component_name: 'amount', actions: ['hide'] },
        { component_name: 'reason', actions: ['editable'] },
        { component_name: 'department', actions: ['disabled'] },
      ]);

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPLICANT);

      // Assert
      expect(result.hiddenNames).toEqual(['amount']);
      expect(result.editableNames).toEqual([]);
      expect(result.disableNames).toEqual(['department']);
    });

    it('should return start node required when role is applicant', () => {
      // Arrange
      const flow = createFlow([
        { component_name: 'amount', actions: ['required'] },
      ]);

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPLICANT);

      // Assert
      expect(result.requiredNames).toEqual(['amount']);
    });

    // =========================================================================
    // role: approver (approval node intersection logic)
    // =========================================================================

    it('should return approval node hide with no editable when role is approver', () => {
      // Arrange
      const flow = createFlow(
        [{ component_name: 'department', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, ['node_a']);

      // Assert
      expect(result.hiddenNames).toEqual(['amount']);
      expect(result.editableNames).toEqual([]);
    });

    it('should return intersection of hidden names when approver has multiple nodes', () => {
      // Arrange
      const flow = createFlow(
        [],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
            { component_name: 'reason', actions: ['hide'] },
          ]),
          createApprovalNode('node_b', [
            { component_name: 'reason', actions: ['hide'] },
            { component_name: 'department', actions: ['hide'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, [
        'node_a',
        'node_b',
      ]);

      // Assert — only 'reason' hidden in both nodes
      expect(result.hiddenNames).toEqual(['reason']);
    });

    it('should return empty hidden when one node hides and another does not', () => {
      // Arrange
      const flow = createFlow(
        [],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
          ]),
          createApprovalNode('node_b'),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, [
        'node_a',
        'node_b',
      ]);

      // Assert
      expect(result.hiddenNames).toEqual([]);
    });

    it('should return empty required when role is approver', () => {
      // Arrange
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['required'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'reason', actions: ['required'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, ['node_a']);

      // Assert
      expect(result.requiredNames).toEqual([]);
    });

    it('should use only start node disable when role is approver', () => {
      // Arrange
      const flow = createFlow(
        [{ component_name: 'department', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'reason', actions: ['disabled'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, ['node_a']);

      // Assert — only start node disable, not approval node
      expect(result.disableNames).toEqual(['department']);
    });

    it('should skip rules with condition when condition is present', () => {
      // Arrange
      const flow = createFlow(
        [],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
            {
              component_name: 'reason',
              actions: ['hide'],
              condition: 'getApplicantProfile().jobGrade <= "L3"',
            } as { component_name: string; actions: string[] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, ['node_a']);

      // Assert
      expect(result.hiddenNames).toEqual(['amount']);
    });

    // =========================================================================
    // role: approver_active
    // =========================================================================

    it('should not inherit start disable when approval does not mention component', () => {
      // Arrange — start: department=disable, approval: amount=editable
      const flow = createFlow(
        [{ component_name: 'department', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['editable'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — pure approval node: no start inheritance
      expect(result.editableNames).toEqual(['amount']);
      expect(result.disableNames).toEqual([]);
    });

    it('should override start disable when approval says editable for same component', () => {
      // Arrange — start: amount=disable, approval: amount=editable
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['editable'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — approval editable overrides start disable
      expect(result.editableNames).toEqual(['amount']);
      expect(result.disableNames).toEqual([]);
    });

    it('should override start editable when approval says disable for same component', () => {
      // Arrange — start: amount=editable, approval: amount=disable
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['editable'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['disabled'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — approval disable overrides, editable only from approval
      expect(result.editableNames).toEqual([]);
      expect(result.disableNames).toEqual(['amount']);
    });

    it('should use only approval disable without inheriting start disable', () => {
      // Arrange — start: dept=disable, approval: amount=disable + reason=editable
      const flow = createFlow(
        [{ component_name: 'department', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['disabled'] },
            { component_name: 'reason', actions: ['editable'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — pure approval node: only amount disabled, department not inherited
      expect(result.editableNames).toEqual(['reason']);
      expect(result.disableNames).toEqual(['amount']);
    });

    it('should return only approval required when role is approver_active', () => {
      // Arrange — start: amount=required, approval: reason=required
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['required'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'reason', actions: ['required'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — pure approval node: only reason required, amount not inherited
      expect(result.requiredNames).toEqual(['reason']);
    });

    it('should override start disable when approval marks same component required', () => {
      // Arrange — start: amount=disable, approval: amount=required
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['disabled'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['required'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — approval required → must be fillable, disabled is removed
      expect(result.requiredNames).toEqual(['amount']);
      expect(result.disableNames).toEqual([]);
    });

    it('should use only approval rules when start required and approval disable', () => {
      // Arrange — start: amount=required, approval: amount=disable
      const flow = createFlow(
        [{ component_name: 'amount', actions: ['required'] }],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['disabled'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
      ]);

      // Assert — pure approval node: disabled from approval, required not inherited from start
      expect(result.requiredNames).toEqual([]);
      expect(result.disableNames).toEqual(['amount']);
    });

    it('should collect editable union from multiple nodes when role is approver_active', () => {
      // Arrange
      const flow = createFlow(
        [],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['editable'] },
          ]),
          createApprovalNode('node_b', [
            { component_name: 'reason', actions: ['editable'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER_ACTIVE, [
        'node_a',
        'node_b',
      ]);

      // Assert
      expect(result.editableNames).toEqual(
        expect.arrayContaining(['amount', 'reason']),
      );
    });

    // =========================================================================
    // edge cases
    // =========================================================================

    it('should return empty rules when no component_rules defined', () => {
      // Arrange
      const flow = createFlow();

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPLICANT_DRAFT);

      // Assert
      expect(result.hiddenNames).toEqual([]);
      expect(result.editableNames).toEqual([]);
      expect(result.disableNames).toEqual([]);
    });

    it('should return empty rules when approver has no node keys', () => {
      // Arrange
      const flow = createFlow(
        [],
        [
          createApprovalNode('node_a', [
            { component_name: 'amount', actions: ['hide'] },
          ]),
        ],
      );

      // Act
      const result = resolveWithNodes(flow, VIEWER_ROLE.APPROVER, []);

      // Assert
      expect(result.hiddenNames).toEqual([]);
      expect(result.editableNames).toEqual([]);
    });
  });

  // ===========================================================================
  // applyComponentRules
  // ===========================================================================

  describe('applyComponentRules', () => {
    const createFormSchema = (): FormSchema => ({
      root: ['uuid-1', 'uuid-2', 'uuid-3'],
      entities: {
        'uuid-1': {
          type: 'number',
          attributes: { name: 'amount', label: 'Amount', required: true },
        },
        'uuid-2': {
          type: 'text',
          attributes: { name: 'reason', label: 'Reason', required: true },
        },
        'uuid-3': {
          type: 'dropdown',
          attributes: {
            name: 'department',
            label: 'Department',
            required: false,
          },
        },
      },
    });

    // =========================================================================
    // hide
    // =========================================================================

    it('should remove hidden entities from schema root and entities', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema } = applyComponentRules(schema, formData, [
        'amount',
      ]);

      // Assert
      expect(filteredSchema.root).toEqual(['uuid-2', 'uuid-3']);
      expect(filteredSchema.entities['uuid-1']).toBeUndefined();
      expect(filteredSchema.entities['uuid-2']).toBeDefined();
      expect(filteredSchema.entities['uuid-3']).toBeDefined();
    });

    it('should remove hidden keys from form_data', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredData } = applyComponentRules(schema, formData, [
        'amount',
        'reason',
      ]);

      // Assert
      expect(filteredData).toEqual({ department: 'IT' });
    });

    // =========================================================================
    // readonly (editable)
    // =========================================================================

    it('should set readonly true on all entities when no editable names', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema } = applyComponentRules(schema, formData, []);

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-2'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-3'].attributes.readonly).toBe(true);
    });

    it('should set readonly false on editable components and true on others', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema } = applyComponentRules(
        schema,
        formData,
        [],
        ['amount'],
      );

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.readonly).toBe(false);
      expect(filteredSchema.entities['uuid-2'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-3'].attributes.readonly).toBe(true);
    });

    // =========================================================================
    // disable
    // =========================================================================

    it('should set disable true on matched components and false on others', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema } = applyComponentRules(
        schema,
        formData,
        [],
        [],
        ['amount'],
      );

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.disabled).toBe(true);
      expect(filteredSchema.entities['uuid-2'].attributes.disabled).toBe(false);
      expect(filteredSchema.entities['uuid-3'].attributes.disabled).toBe(false);
    });

    it('should set disable false on all entities when no disable names', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test' };

      // Act
      const { filteredSchema } = applyComponentRules(schema, formData, []);

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.disabled).toBe(false);
      expect(filteredSchema.entities['uuid-2'].attributes.disabled).toBe(false);
    });

    // =========================================================================
    // required
    // =========================================================================

    it('should set required true on matched components and false on others', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema } = applyComponentRules(
        schema,
        formData,
        [],
        [],
        [],
        ['amount'],
      );

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.required).toBe(true);
      expect(filteredSchema.entities['uuid-2'].attributes.required).toBe(false);
      expect(filteredSchema.entities['uuid-3'].attributes.required).toBe(false);
    });

    it('should set required false on all entities when no required names', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test' };

      // Act
      const { filteredSchema } = applyComponentRules(schema, formData, []);

      // Assert
      expect(filteredSchema.entities['uuid-1'].attributes.required).toBe(false);
      expect(filteredSchema.entities['uuid-2'].attributes.required).toBe(false);
      expect(filteredSchema.entities['uuid-3'].attributes.required).toBe(false);
    });

    // =========================================================================
    // defaults (no rules)
    // =========================================================================

    it('should set readonly true and disable false on all entities when no rules', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test' };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        [],
      );

      // Assert
      expect(filteredSchema.root).toEqual(schema.root);
      expect(filteredSchema.entities['uuid-1'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-1'].attributes.disabled).toBe(false);
      expect(filteredSchema.entities['uuid-2'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-2'].attributes.disabled).toBe(false);
      expect(filteredData).toEqual(formData);
    });

    // =========================================================================
    // combined
    // =========================================================================

    it('should apply hide, readonly, and disable together', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        ['amount'],
        ['reason'],
        ['department'],
      );

      // Assert
      expect(filteredSchema.entities['uuid-1']).toBeUndefined();
      expect(filteredSchema.entities['uuid-2'].attributes.readonly).toBe(false);
      expect(filteredSchema.entities['uuid-2'].attributes.disabled).toBe(false);
      expect(filteredSchema.entities['uuid-3'].attributes.readonly).toBe(true);
      expect(filteredSchema.entities['uuid-3'].attributes.disabled).toBe(true);
      expect(filteredData).toEqual({ reason: 'test', department: 'IT' });
    });

    it('should not mutate original objects', () => {
      // Arrange
      const schema = createFormSchema();
      const formData = { amount: 1000, reason: 'test', department: 'IT' };
      const originalRoot = [...schema.root];
      const originalEntityKeys = Object.keys(schema.entities);
      const originalDataKeys = Object.keys(formData);

      // Act
      applyComponentRules(schema, formData, ['amount']);

      // Assert
      expect(schema.root).toEqual(originalRoot);
      expect(Object.keys(schema.entities)).toEqual(originalEntityKeys);
      expect(Object.keys(formData)).toEqual(originalDataKeys);
    });

    // =========================================================================
    // container hide
    // =========================================================================

    /**
     * Container schema:
     *   root: [container]
     *   container (name: container_a) -> children: [child1, child2]
     *     child1 (name: text_a)
     *     child2 (name: number_a)
     */
    const createContainerSchema = (): FormSchema => ({
      root: ['container-uuid'],
      entities: {
        'container-uuid': {
          type: 'container',
          attributes: {
            name: 'container_a',
            slotMapping: { 'child1-uuid': 0, 'child2-uuid': 1 },
          },
          children: ['child1-uuid', 'child2-uuid'],
        },
        'child1-uuid': {
          type: 'text',
          attributes: { name: 'text_a' },
          parentId: 'container-uuid',
        },
        'child2-uuid': {
          type: 'number',
          attributes: { name: 'number_a' },
          parentId: 'container-uuid',
        },
      },
    });

    it('should remove child from parent container children and slotMapping when hidden', () => {
      // Arrange
      const schema = createContainerSchema();
      const formData = { text_a: 'hello', number_a: 42 };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        ['text_a'],
      );

      // Assert
      expect(filteredSchema.entities['child1-uuid']).toBeUndefined();
      expect(filteredSchema.entities['child2-uuid']).toBeDefined();
      expect(filteredSchema.entities['container-uuid']).toBeDefined();
      expect(filteredSchema.entities['container-uuid'].children).toEqual([
        'child2-uuid',
      ]);
      expect(
        filteredSchema.entities['container-uuid'].attributes.slotMapping,
      ).toEqual({ 'child2-uuid': 1 });
      expect(filteredSchema.root).toEqual(['container-uuid']);
      expect(filteredData).toEqual({ number_a: 42 });
    });

    it('should remove container when all children are hidden', () => {
      // Arrange
      const schema = createContainerSchema();
      const formData = { text_a: 'hello', number_a: 42 };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        ['text_a', 'number_a'],
      );

      // Assert
      expect(filteredSchema.root).toEqual([]);
      expect(filteredSchema.entities['container-uuid']).toBeUndefined();
      expect(filteredSchema.entities['child1-uuid']).toBeUndefined();
      expect(filteredSchema.entities['child2-uuid']).toBeUndefined();
      expect(filteredData).toEqual({});
    });

    it('should propagate hide through nested containers when all leaves are hidden', () => {
      // Arrange
      // root: [outer]
      //   outer (container_outer) -> [inner]
      //     inner (container_inner) -> [leaf]
      //       leaf (text_leaf)
      const schema: FormSchema = {
        root: ['outer-uuid'],
        entities: {
          'outer-uuid': {
            type: 'container',
            attributes: { name: 'container_outer' },
            children: ['inner-uuid'],
          },
          'inner-uuid': {
            type: 'container',
            attributes: { name: 'container_inner' },
            children: ['leaf-uuid'],
            parentId: 'outer-uuid',
          },
          'leaf-uuid': {
            type: 'text',
            attributes: { name: 'text_leaf' },
            parentId: 'inner-uuid',
          },
        },
      };
      const formData = { text_leaf: 'x' };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        ['text_leaf'],
      );

      // Assert
      expect(filteredSchema.root).toEqual([]);
      expect(filteredSchema.entities).toEqual({});
      expect(filteredData).toEqual({});
    });

    it('should keep container when only some children are hidden', () => {
      // Arrange
      const schema = createContainerSchema();
      const formData = { text_a: 'hello', number_a: 42 };

      // Act
      const { filteredSchema, filteredData } = applyComponentRules(
        schema,
        formData,
        ['number_a'],
      );

      // Assert
      expect(filteredSchema.root).toEqual(['container-uuid']);
      expect(filteredSchema.entities['container-uuid'].children).toEqual([
        'child1-uuid',
      ]);
      expect(
        filteredSchema.entities['container-uuid'].attributes.slotMapping,
      ).toEqual({ 'child1-uuid': 0 });
      expect(filteredSchema.entities['child1-uuid']).toBeDefined();
      expect(filteredSchema.entities['child2-uuid']).toBeUndefined();
      expect(filteredData).toEqual({ text_a: 'hello' });
    });
  });
});
