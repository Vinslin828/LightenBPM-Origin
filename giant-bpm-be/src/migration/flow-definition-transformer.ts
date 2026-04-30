import {
  ApproverConfig,
  ApproverType,
  FlowDefinition,
  NodeType,
} from '../flow-engine/types';

export class FlowDefinitionTransformer {
  constructor(
    private readonly userMapping: Map<number, number>,
    private readonly orgUnitMapping: Map<number, number>,
  ) {}

  transform(flow: FlowDefinition): FlowDefinition {
    if (!flow || !flow.nodes) return flow;

    flow.nodes.forEach((node) => {
      if (node.type === NodeType.APPROVAL) {
        if (Array.isArray(node.approvers)) {
          node.approvers.forEach((config: ApproverConfig) =>
            this.transformApproverConfig(config),
          );
        } else if (node.approvers) {
          this.transformApproverConfig(node.approvers);
        }
      }
    });

    return flow;
  }

  private transformApproverConfig(config: ApproverConfig): void {
    if (!config) return;

    switch (config.type) {
      case ApproverType.SPECIFIC_USERS:
        if ('user_ids' in config.config && config.config.user_ids) {
          config.config.user_ids = config.config.user_ids.map(
            (id: number) => this.userMapping.get(id) || id,
          );
        }
        break;
      case ApproverType.SPECIFIC_USER_REPORTING_LINE:
        if (config.config.user_id) {
          config.config.user_id =
            this.userMapping.get(config.config.user_id) ||
            config.config.user_id;
        }
        break;
      case ApproverType.DEPARTMENT_HEAD:
        if (config.config.org_unit_id) {
          config.config.org_unit_id =
            this.orgUnitMapping.get(config.config.org_unit_id) ||
            config.config.org_unit_id;
        }
        break;
      case ApproverType.ROLE:
        if (config.config.role_id) {
          config.config.role_id =
            this.orgUnitMapping.get(config.config.role_id) ||
            config.config.role_id;
        }
        break;
    }
  }
}
