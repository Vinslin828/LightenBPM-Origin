import { type ComponentType } from "react";
import type { EntitiesComponents } from "@coltorapps/builder-react";

import { basicFormBuilder } from "@/components/form/builder/definition";
import { entitiesComponents } from "@/const/form-builder";
import { useEntityRuntimeStatus } from "@/hooks/useEntityRuntimeStatus";
import type { FormSchema } from "@/types/domain";

export function getHiddenEntityIds(formSchema: FormSchema): Set<string> {
  const entities = formSchema?.entities ?? {};
  const hiddenIds = new Set<string>();

  Object.entries(entities).forEach(([entityId, entity]) => {
    const attributes = (entity?.attributes ?? {}) as Record<string, unknown>;
    if (attributes.hide === true) {
      hiddenIds.add(entityId);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    Object.entries(entities).forEach(([entityId, entity]) => {
      const parentId = (entity as { parentId?: string }).parentId;
      if (parentId && hiddenIds.has(parentId) && !hiddenIds.has(entityId)) {
        hiddenIds.add(entityId);
        changed = true;
      }
    });
  }

  return hiddenIds;
}

export function createVisibleEntityComponents(
  _hiddenEntityIds: Set<string>,
): EntitiesComponents<typeof basicFormBuilder> {
  return Object.fromEntries(
    Object.entries(entitiesComponents).map(([key, EntityComponent]) => {
      const Component = EntityComponent as ComponentType<any>;
      const VisibilityAwareEntity = (props: any) => {
        const runtimeStatus = useEntityRuntimeStatus(props.entity);
        if (runtimeStatus.hidden) {
          return null;
        }

        const entity = {
          ...props.entity,
          attributes: {
            ...props.entity.attributes,
            required: runtimeStatus.required,
            readonly: runtimeStatus.readonly,
            disabled: runtimeStatus.disabled,
          },
        };

        return <Component {...props} entity={entity} />;
      };

      return [key, VisibilityAwareEntity];
    }),
  ) as EntitiesComponents<typeof basicFormBuilder>;
}
