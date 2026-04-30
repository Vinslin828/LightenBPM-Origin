import { EditIcon, HideIcon, StartIcon } from "@/components/icons";
import { UseModalReturn } from "@/hooks/useModal";
import { VisibilityRule, VisibilityAction } from "@/types/flow";
import { FormDefinition } from "@/types/domain";
import { Button } from "@ui/button";
import { Modal } from "@ui/modal";
import { cn } from "@/utils/cn";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BuilderStore } from "@coltorapps/builder";
import {
  BuilderEntities,
  useBuilderStore,
  useBuilderStoreData,
} from "@coltorapps/builder-react";
import { basicFormBuilder } from "@/components/form/builder/definition";
import {
  entitiesComponents,
  hydrateSchemaWithRequiredDefaults,
} from "@/const/form-builder";
import { FormBuilderModeContext } from "@/components/form/builder/canvas";
import { EntityKey } from "@/types/form-builder";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@ui/checkbox";
import { Toggle } from "@ui/toggle";
import {
  DEFAULT_VISIBILITY_OPTIONS,
  getVisibilityFallbackActionsByComponent,
  normalizeVisibilityActions,
  normalizeVisibilityRules,
  VISIBILITY_OPTIONS,
  VisibilityRuleSource,
} from "@/const/flow";

type VisibilityModalProps = UseModalReturn & {
  formName?: string;
  formSchema?: FormDefinition["schema"];
  initialRules?: VisibilityRule[];
  fallbackRules?: VisibilityRule[];
  useSchemaDefaults?: boolean;
  defaultSource: VisibilityRuleSource;
  onSave?: (rules: VisibilityRule[]) => void;
  header?: ReactNode;
};

type FormEntityItem = {
  id: string;
  name: string;
  label: string;
  type: string;
};

const sanitizeActions = (
  actions: VisibilityAction[] | undefined,
): VisibilityAction[] => normalizeVisibilityActions(actions ?? []);

const resolveEntityActions = (
  rules: VisibilityRule[],
  componentName: string,
  fallbackActionsByComponent?: Record<string, VisibilityAction[]>,
): VisibilityAction[] => {
  const explicitActions = getRuleByComponentName(rules, componentName)?.actions;
  if (explicitActions) {
    return sanitizeActions(explicitActions);
  }
  return sanitizeActions(fallbackActionsByComponent?.[componentName]);
};

const areActionsEqual = (
  left: VisibilityAction[],
  right: VisibilityAction[],
) => {
  if (left.length !== right.length) return false;
  return left.every((action, index) => action === right[index]);
};

const getAttributeLabel = (
  attributes: Record<string, unknown>,
  fallback: string,
) => {
  const label = attributes.label as
    | string
    | { value?: string; isReference?: boolean }
    | undefined;
  if (typeof label === "string" && label.trim()) return label;
  if (
    label &&
    typeof label === "object" &&
    typeof label.value === "string" &&
    label.value.trim()
  ) {
    return label.value;
  }
  return fallback;
};

const getEntitiesFromSchema = (
  formSchema?: FormDefinition["schema"],
): FormEntityItem[] => {
  if (!formSchema) return [];

  const entities = formSchema.entities ?? {};
  const root = formSchema.root ?? [];
  const visited = new Set<string>();
  const result: FormEntityItem[] = [];

  const visit = (entityId: string) => {
    if (visited.has(entityId)) return;
    const entity = entities[entityId];
    if (!entity) return;
    visited.add(entityId);

    const attributes = (entity.attributes ?? {}) as Record<string, unknown>;
    const name =
      typeof attributes.name === "string" && attributes.name.trim()
        ? attributes.name
        : entityId;

    result.push({
      id: entityId,
      name,
      label: getAttributeLabel(attributes, name),
      type: entity.type,
    });

    Object.entries(entities).forEach(([childId, childEntity]) => {
      if ((childEntity as { parentId?: string }).parentId === entityId) {
        visit(childId);
      }
    });
  };

  root.forEach(visit);
  Object.keys(entities).forEach(visit);
  return result;
};

const getRuleByComponentName = (
  rules: VisibilityRule[],
  componentName: string,
) => {
  return rules.find((rule) => rule.componentName === componentName);
};

const setRuleActions = (
  prevRules: VisibilityRule[],
  componentName: string,
  nextActions: VisibilityAction[],
) => {
  const normalizedActions = sanitizeActions(nextActions);
  const nextRules = [...prevRules];
  const index = nextRules.findIndex(
    (rule) => rule.componentName === componentName,
  );

  const nextRule: VisibilityRule = {
    componentName,
    actions: normalizedActions,
  };
  if (index >= 0) {
    nextRules[index] = { ...nextRules[index], ...nextRule };
  } else {
    nextRules.push(nextRule);
  }

  return nextRules;
};

const removeRule = (prevRules: VisibilityRule[], componentName: string) => {
  return prevRules.filter((rule) => rule.componentName !== componentName);
};

function Entity(props: {
  entityId: string;
  children: ReactNode;
  isActive: boolean;
  isDragging: boolean;
  isHidden?: boolean;
  isEditable?: boolean;
  onFocus?: () => void;
  builderStore: BuilderStore<typeof basicFormBuilder>;
}) {
  const { entitiesAttributesErrors } = useBuilderStoreData(
    props.builderStore,
    (events) =>
      events.some(
        (event) =>
          (event.name === "EntityAttributeErrorUpdated" &&
            event.payload.entity.id === props.entityId) ||
          event.name === "DataSet",
      ),
  );
  const { t } = useTranslation("translation", {
    keyPrefix: "form_builder.entities",
  });
  const entity = props.builderStore.getEntity(props.entityId);

  if (!entity) return null;

  const { type, attributes } = entity;
  const isContainer = type === EntityKey.container;
  // const columnLabel = isContainer
  //   ? ` (${t("n_columns", {
  //       count:
  //         (attributes as unknown as ContainerDefaults).containerColumns ?? 2,
  //     })})`
  //   : "";

  return (
    <div
      className={cn(
        "flex flex-col w-full min-w-full hover:inset-ring-2 hover:inset-ring-lighten-blue hover:rounded-md flex-1 p-4",
        props.isHidden ? "bg-gray-2" : "bg-white",
        // type === EntityKey.container && "hover:inset-ring-transparent",
        {
          "inset-ring-lighten-blue inset-ring-2 rounded-md":
            props.isActive || props.isDragging,
          "border-destructive":
            !props.isActive &&
            entitiesAttributesErrors[props.entityId] &&
            !props.isDragging,
        },
      )}
      onFocusCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (type === "container") return;
        props.onFocus?.();
      }}
    >
      {/* <div className="flex flex-row justify-between">
        {props.isActive && (
          <span className="text-primary-text text-xs font-base pb-3">
            {`${t(getEntityLabelKey(type) ?? "unknown")}${columnLabel}`}
          </span>
        )}
      </div> */}

      <div
        className={cn("flex-1 flex flex-col justify-start", {
          "pointer-events-none": !isContainer,
        })}
      >
        {/* {!isContainer ? (
          <div className="flex justify-end pointer-events-auto min-w-0">
            <FieldNameCopy
              fieldName={(entity.attributes as { name?: string }).name ?? ""}
            />
          </div>
        ) : null} */}
        {props.isEditable && (
          <div className="flex justify-end pointer-events-auto min-w-0 pb-2">
            <EditIcon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        {props.isHidden && (
          <div className="flex justify-end pointer-events-auto min-w-0 pb-2">
            <HideIcon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        {props.children}
      </div>
    </div>
  );
}

export function VisibilityModal({
  isOpen,
  close,
  formName = "Linked form",
  formSchema,
  initialRules = [],
  fallbackRules = [],
  useSchemaDefaults = true,
  defaultSource,
  header,
  onSave,
}: VisibilityModalProps) {
  const previewBuilderStore = useBuilderStore(basicFormBuilder);
  const {
    schema: { root },
  } = useBuilderStoreData(previewBuilderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  );
  const entities = useMemo(
    () => getEntitiesFromSchema(formSchema),
    [formSchema],
  );
  const hydratedSchema = useMemo(
    () =>
      hydrateSchemaWithRequiredDefaults(
        formSchema ?? { root: [], entities: {} },
      ),
    [formSchema],
  );
  const normalizedInitialRules = useMemo(
    () => normalizeVisibilityRules(initialRules),
    [initialRules],
  );
  const schemaDefaultActionsByComponent = useMemo(() => {
    if (fallbackRules.length > 0) {
      return fallbackRules.reduce<Record<string, VisibilityAction[]>>(
        (acc, rule) => {
          acc[rule.componentName] = sanitizeActions(rule.actions);
          return acc;
        },
        {},
      );
    }

    if (!useSchemaDefaults) {
      return {};
    }

    return getVisibilityFallbackActionsByComponent(formSchema, defaultSource);
  }, [fallbackRules, formSchema, defaultSource, useSchemaDefaults]);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draftRules, setDraftRules] = useState<VisibilityRule[]>(
    normalizedInitialRules,
  );

  useEffect(() => {
    previewBuilderStore.setData({
      schema: hydratedSchema,
      entitiesAttributesErrors: {},
      schemaError: undefined,
    });
  }, [previewBuilderStore, hydratedSchema]);

  useEffect(() => {
    if (!isOpen) return;
    setDraftRules(normalizedInitialRules);
    setSelectedEntityId(entities[0]?.id ?? null);
  }, [isOpen, normalizedInitialRules, entities]);

  useEffect(() => {
    if (!isOpen) return;

    previewBuilderStore.setData({
      schema: hydratedSchema,
      entitiesAttributesErrors: {},
      schemaError: undefined,
    });

    entities.forEach((entity) => {
      const actions = resolveEntityActions(
        draftRules,
        entity.name,
        schemaDefaultActionsByComponent,
      );
      previewBuilderStore.setEntityAttribute(
        entity.id,
        "required",
        actions.includes(VisibilityAction.REQUIRED),
      );
      previewBuilderStore.setEntityAttribute(
        entity.id,
        "disabled",
        actions.includes(VisibilityAction.DISABLED),
      );
      previewBuilderStore.setEntityAttribute(
        entity.id,
        "readonly",
        !actions.includes(VisibilityAction.EDITABLE),
      );
    });

    console.debug("[VisibilityModal] preview schema", {
      schema: previewBuilderStore.getData().schema,
      draftRules,
    });
  }, [
    isOpen,
    previewBuilderStore,
    hydratedSchema,
    entities,
    draftRules,
    schemaDefaultActionsByComponent,
  ]);

  const selectedEntity = useMemo(
    () =>
      entities.find((entity) => entity.id === selectedEntityId) ?? entities[0],
    [entities, selectedEntityId],
  );

  const selectedActions = useMemo(() => {
    if (!selectedEntity) return [] as VisibilityAction[];
    return resolveEntityActions(
      draftRules,
      selectedEntity.name,
      schemaDefaultActionsByComponent,
    );
  }, [selectedEntity, draftRules, schemaDefaultActionsByComponent]);
  const availableVisibilityActions = useMemo(() => {
    if (!selectedEntity) return DEFAULT_VISIBILITY_OPTIONS;
    return (
      VISIBILITY_OPTIONS[selectedEntity.type as EntityKey] ??
      DEFAULT_VISIBILITY_OPTIONS
    );
  }, [selectedEntity]);
  const canToggleHide = availableVisibilityActions.includes(
    VisibilityAction.HIDE,
  );
  const selectableActions = useMemo(
    () =>
      availableVisibilityActions.filter(
        (action) => action !== VisibilityAction.HIDE,
      ),
    [availableVisibilityActions],
  );
  const canSetRequired = selectableActions.includes(VisibilityAction.REQUIRED);
  const canSetEditable = selectableActions.includes(VisibilityAction.EDITABLE);
  const canSetDisabled = selectableActions.includes(VisibilityAction.DISABLED);

  const showComponent = canToggleHide
    ? !selectedActions.includes(VisibilityAction.HIDE)
    : true;
  const required = selectedActions.includes(VisibilityAction.REQUIRED);
  const editable = selectedActions.includes(VisibilityAction.EDITABLE);
  const disabled = selectedActions.includes(VisibilityAction.DISABLED);
  const shouldDisableDisabledOption = editable || required;
  const shouldDisableEditableAndRequiredOptions = disabled;

  const onToggleShow = (checked: boolean) => {
    if (!selectedEntity) return;
    setDraftRules((prev) => {
      const currentActions = resolveEntityActions(
        prev,
        selectedEntity.name,
        schemaDefaultActionsByComponent,
      ).filter((item) => item !== VisibilityAction.HIDE);

      const nextActions: VisibilityAction[] = checked
        ? currentActions
        : [...currentActions, VisibilityAction.HIDE];

      const defaultActions = sanitizeActions(
        schemaDefaultActionsByComponent[selectedEntity.name],
      );
      if (areActionsEqual(sanitizeActions(nextActions), defaultActions)) {
        return removeRule(prev, selectedEntity.name);
      }
      return setRuleActions(prev, selectedEntity.name, nextActions);
    });
  };

  const onToggleAction = (action: VisibilityAction, checked: boolean) => {
    if (!selectedEntity || action === VisibilityAction.HIDE) return;

    setDraftRules((prev) => {
      const currentActions = resolveEntityActions(
        prev,
        selectedEntity.name,
        schemaDefaultActionsByComponent,
      );
      let nextActions = currentActions.filter(
        (item) => item !== VisibilityAction.HIDE,
      );

      // VisibilityAction.DISABLED is mutually exclusive with EDITABLE and REQUIRED.
      if (
        action === VisibilityAction.DISABLED &&
        checked &&
        (currentActions.includes(VisibilityAction.EDITABLE) ||
          currentActions.includes(VisibilityAction.REQUIRED))
      ) {
        return prev;
      }
      if (
        (action === VisibilityAction.EDITABLE ||
          action === VisibilityAction.REQUIRED) &&
        checked &&
        currentActions.includes(VisibilityAction.DISABLED)
      ) {
        return prev;
      }

      if (action === VisibilityAction.EDITABLE) {
        nextActions = checked
          ? [...nextActions, VisibilityAction.EDITABLE]
          : nextActions.filter((item) => item !== VisibilityAction.EDITABLE);
      } else if (checked) {
        nextActions = [...nextActions, action];
      } else {
        nextActions = nextActions.filter((item) => item !== action);
      }

      const defaultActions = sanitizeActions(
        schemaDefaultActionsByComponent[selectedEntity.name],
      );
      if (areActionsEqual(sanitizeActions(nextActions), defaultActions)) {
        return removeRule(prev, selectedEntity.name);
      }
      return setRuleActions(prev, selectedEntity.name, nextActions);
    });
  };

  const isChanged =
    JSON.stringify(normalizeVisibilityRules(draftRules)) !==
    JSON.stringify(normalizedInitialRules);

  const handleSave = () => {
    onSave?.(normalizeVisibilityRules(draftRules));
    close();
  };

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      // size="full"
      className="w-[1088px] max-w-5/6 max-h-[90dvh]"
    >
      <div className="w-full p-7 bg-white rounded-[20px] flex flex-col items-center gap-7">
        <div className="self-stretch text-center text-gray-900 text-2xl font-semibold leading-8">
          Visibility
        </div>

        <div className="flex flex-col items-center gap-5 overflow-y-hidden w-full">
          {!!header && header}

          <div className="bg-gray-3 rounded-md border border-stroke w-full h-[60dvh] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_384px] h-full">
              <div className="p-2.5 overflow-y-auto h-full">
                <div className="w-full bg-white rounded-md flex flex-col">
                  <div className="text-gray-900 text-base font-medium leading-6 p-4">
                    {formName}
                  </div>
                  {root.length ? (
                    <FormBuilderModeContext.Provider value={true}>
                      <BuilderEntities
                        builderStore={previewBuilderStore}
                        components={entitiesComponents}
                      >
                        {(props) => {
                          const parentEntity = props.entity.parentId
                            ? previewBuilderStore.getEntity(
                                props.entity.parentId,
                              )
                            : null;
                          const entityAttributes = props.entity.attributes as {
                            name?: string;
                          };
                          const entityName =
                            typeof entityAttributes.name === "string" &&
                            entityAttributes.name.trim()
                              ? entityAttributes.name
                              : props.entity.id;
                          const entityActions = resolveEntityActions(
                            draftRules,
                            entityName,
                            schemaDefaultActionsByComponent,
                          );
                          const isHidden = entityActions.includes(
                            VisibilityAction.HIDE,
                          );
                          const isEditable = entityActions.includes(
                            VisibilityAction.EDITABLE,
                          );

                          return (
                            <div
                              className={cn(
                                "bg-white first:rounded-t-md last:rounded-b-md flex-1 flex flex-col overflow-hidden",
                                {
                                  "bg-transparent":
                                    props.entity.type === "container",
                                  "rounded-md":
                                    parentEntity?.type === "container",
                                },
                              )}
                            >
                              <Entity
                                builderStore={previewBuilderStore}
                                entityId={props.entity.id}
                                isActive={selectedEntityId === props.entity.id}
                                isDragging={false}
                                isHidden={isHidden}
                                isEditable={isEditable}
                                // onFocus={() =>
                                //   selectedEntityId === props.entity.id
                                //     ? setSelectedEntityId(null)
                                //     : setSelectedEntityId(props.entity.id)
                                // }
                                onFocus={() =>
                                  setSelectedEntityId(props.entity.id)
                                }
                              >
                                {props.children}
                              </Entity>
                            </div>
                          );
                        }}
                      </BuilderEntities>
                    </FormBuilderModeContext.Provider>
                  ) : (
                    <div className="p-6 text-secondary-text text-sm">
                      No components found in form schema.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border-l border-stroke overflow-y-auto scrollbar no-scrollbar h-full min-h-0">
                <div className="h-14 px-5 border-b border-stroke flex items-center">
                  <div className="flex-1 text-gray-900 text-base font-semibold leading-6">
                    Visibility
                  </div>
                </div>
                <div className="px-5 py-4 bg-gray-100 border-b border-stroke flex flex-col gap-4">
                  <div className="text-sm text-secondary-text">
                    {selectedEntity
                      ? `${selectedEntity.label} (${selectedEntity.name})`
                      : "Select a component from canvas"}
                  </div>

                  {canToggleHide && (
                    <div className="h-9 flex justify-between items-center">
                      <div className="text-gray-900 text-base font-medium leading-6">
                        Show component
                      </div>
                      <Toggle
                        pressed={showComponent}
                        onPressedChange={onToggleShow}
                        disabled={!selectedEntity}
                      />
                    </div>
                  )}

                  {canSetRequired && (
                    <label className="inline-flex items-center gap-2.5">
                      <Checkbox
                        checked={required}
                        onCheckedChange={(checked) =>
                          onToggleAction(VisibilityAction.REQUIRED, checked)
                        }
                        disabled={
                          !selectedEntity ||
                          !showComponent ||
                          shouldDisableEditableAndRequiredOptions
                        }
                      />
                      <span className="text-gray-900 text-base font-normal leading-6">
                        Required
                      </span>
                    </label>
                  )}

                  {canSetEditable && (
                    <label className="inline-flex items-center gap-2.5">
                      <Checkbox
                        checked={editable}
                        onCheckedChange={(checked) =>
                          onToggleAction(VisibilityAction.EDITABLE, checked)
                        }
                        disabled={
                          !selectedEntity ||
                          !showComponent ||
                          shouldDisableEditableAndRequiredOptions
                        }
                      />
                      <span className="text-gray-900 text-base font-normal leading-6">
                        Editable
                      </span>
                    </label>
                  )}

                  {canSetDisabled && (
                    <label className="inline-flex items-center gap-2.5">
                      <Checkbox
                        checked={disabled}
                        onCheckedChange={(checked) =>
                          onToggleAction(VisibilityAction.DISABLED, checked)
                        }
                        disabled={
                          !selectedEntity ||
                          !showComponent ||
                          shouldDisableDisabledOption
                        }
                      />
                      <span className="text-gray-900 text-base font-normal leading-6">
                        Disabled
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-start gap-4 sticky bottom-0">
          <Button variant="tertiary" className="w-48" onClick={close}>
            Cancel
          </Button>
          <Button className="w-48" onClick={handleSave} disabled={!isChanged}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default VisibilityModal;
