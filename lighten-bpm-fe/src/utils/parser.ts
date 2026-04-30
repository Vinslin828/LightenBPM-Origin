import { FormDefinition } from "@/types/domain";
import { EntityKey } from "@/types/form-builder";

// This is the union of all possible entity types from the builder.
// It correctly represents the type of a value in the `entities` map.
type FormBuilderEntity = FormDefinition["schema"]["entities"][string];

// The backend format, where entities are keyed by their 'name' attribute.
export interface BackendFormSchema {
  root: string[]; // Array of field names
  entities: Record<string, FormBuilderEntity>; // Keyed by field name
}

function normalizeToggleValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}

/**
 * Recursively converts UUID-keyed entities to name-keyed entities,
 * processing children of container-like entities.
 * Returns a mapping of old UUID → new name key for updating children arrays.
 */
function parseEntitiesRecursive(
  ids: readonly string[],
  allEntities: Record<string, FormBuilderEntity>,
  outEntities: Record<string, FormBuilderEntity>,
  parentNewKey?: string,
): Record<string, string> {
  const idToName: Record<string, string> = {};

  for (const id of ids) {
    const entity = allEntities[id];
    if (!entity) continue;

    const attributes = entity.attributes as Record<string, unknown> | undefined;
    const name =
      typeof attributes?.name === "string" && attributes.name
        ? attributes.name
        : id;

    idToName[id] = name;

    let mapped: FormBuilderEntity = parentNewKey
      ? { ...entity, parentId: parentNewKey }
      : entity;

    const children: string[] | undefined = (entity as { children?: string[] })
      .children;
    if (children && children.length > 0) {
      const childIdToName = parseEntitiesRecursive(
        children,
        allEntities,
        outEntities,
        name,
      );
      Object.assign(idToName, childIdToName);
      const newChildren = children
        .map((childId) => childIdToName[childId])
        .filter((n): n is string => !!n);
      mapped = { ...mapped, children: newChildren };

      // Remap slotMapping keys from old UUIDs to new name keys
      const slotMapping = (mapped as { attributes?: Record<string, unknown> })
        .attributes?.slotMapping as Record<string, number> | undefined;
      if (slotMapping) {
        const remapped: Record<string, number> = {};
        for (const [childId, slot] of Object.entries(slotMapping)) {
          const newKey = childIdToName[childId];
          if (newKey) remapped[newKey] = slot;
        }
        mapped = {
          ...mapped,
          attributes: { ...mapped.attributes, slotMapping: remapped },
        } as FormBuilderEntity;
      }
    }

    outEntities[name] = mapped;
  }

  return idToName;
}

/**
 * Parses the form schema from the builder format to the backend format.
 * In the backend format, the UUIDs are replaced by the field names.
 *
 * @param originalSchema The form schema in the original builder format (UUID-keyed).
 * @returns The form schema in the backend-compatible format (name-keyed).
 */
export function parseFormSchema(
  originalSchema: FormDefinition["schema"],
): BackendFormSchema {
  if (!originalSchema?.root || !originalSchema?.entities) {
    return { root: [], entities: {} };
  }

  const { root, entities } = originalSchema;

  const newEntities: Record<string, FormBuilderEntity> = {};
  const idToName = parseEntitiesRecursive(root, entities, newEntities);
  const newRoot = root
    .map((id) => idToName[id])
    .filter((n): n is string => !!n);

  return {
    root: newRoot,
    entities: newEntities,
  };
}

/**
 * Recursively converts name-keyed entities back to UUID-keyed entities,
 * generating new UUIDs and updating children arrays.
 */
function deparseEntitiesRecursive(
  keys: string[],
  allEntities: Record<string, FormBuilderEntity>,
  outEntities: Record<string, FormBuilderEntity>,
  parentNewId?: string,
): Record<string, string> {
  const nameToId: Record<string, string> = {};

  for (const key of keys) {
    const entity = allEntities[key];
    if (!entity) continue;

    const newId = crypto.randomUUID();
    nameToId[key] = newId;

    let mapped: FormBuilderEntity = parentNewId
      ? { ...entity, parentId: parentNewId }
      : entity;

    const children: string[] | undefined = (entity as { children?: string[] })
      .children;
    if (children && children.length > 0) {
      const childNameToId = deparseEntitiesRecursive(
        children,
        allEntities,
        outEntities,
        newId,
      );
      Object.assign(nameToId, childNameToId);
      const newChildren = children
        .map((childKey) => childNameToId[childKey])
        .filter((id): id is string => !!id);
      mapped = { ...mapped, children: newChildren };

      // Remap slotMapping keys from old name keys to new UUIDs
      const slotMapping = (mapped as { attributes?: Record<string, unknown> })
        .attributes?.slotMapping as Record<string, number> | undefined;
      if (slotMapping) {
        const remapped: Record<string, number> = {};
        for (const [childKey, slot] of Object.entries(slotMapping)) {
          const newChildId = childNameToId[childKey];
          if (newChildId) remapped[newChildId] = slot;
        }
        mapped = {
          ...mapped,
          attributes: { ...mapped.attributes, slotMapping: remapped },
        } as FormBuilderEntity;
      }
    }

    outEntities[newId] = mapped;
  }

  return nameToId;
}

/**
 * Deparses the form schema from the backend format to the builder format.
 * This is the reverse of parseFormSchema, generating new UUIDs for each field.
 *
 * @param backendSchema The form schema in the backend format (name-keyed).
 * @returns The form schema in the builder-compatible format (UUID-keyed) with new UUIDs.
 */
export function deparseFormSchema(
  backendSchema: BackendFormSchema,
): FormDefinition["schema"] {
  if (!backendSchema?.root || !backendSchema?.entities) {
    return { root: [], entities: {} };
  }

  const { root, entities } = backendSchema;

  const newEntities: Record<string, FormBuilderEntity> = {};
  const nameToId = deparseEntitiesRecursive(root, entities, newEntities);
  const newRoot = root
    .map((key) => nameToId[key])
    .filter((id): id is string => !!id);

  return {
    root: newRoot,
    entities: newEntities,
  };
}

export function parseFormData(
  data: Record<string, unknown>,
  schema: FormDefinition["schema"],
): {
  data: Record<string, unknown>;
  schema: BackendFormSchema;
} {
  const mappedData: Record<string, unknown> = {};

  const entityIdsToProcess = new Set(Object.keys(data));

  entityIdsToProcess.forEach((entityId) => {
    const value = data[entityId];
    const entity = schema.entities?.[entityId];
    const entityName = (
      entity?.attributes as Record<string, unknown> | undefined
    )?.name;
    const fieldName =
      typeof entityName === "string" && entityName.trim().length > 0
        ? entityName.trim()
        : entityId;

    if (entity?.type === EntityKey.currencyField) {
      if (
        typeof value === "object" &&
        value !== null &&
        "value" in value &&
        "currencyCode" in value
      ) {
        mappedData[fieldName] = value;
      } else {
        mappedData[fieldName] = { value, currencyCode: "USD" };
      }
    } else {
      if (value === undefined) return;
      mappedData[fieldName] = value;
    }
  });

  const parsedSchema = parseFormSchema(schema);

  return {
    data: mappedData,
    schema: parsedSchema,
  };
}

export function deparseFormData(
  data: Record<string, unknown>,
  schema: BackendFormSchema,
): { data: Record<string, unknown>; schema: FormDefinition["schema"] } {
  if (!schema?.root || !schema?.entities) {
    return { data, schema: { root: [], entities: {} } };
  }

  const newEntities: Record<string, FormBuilderEntity> = {};
  const nameToId = deparseEntitiesRecursive(
    schema.root,
    schema.entities,
    newEntities,
  );
  const newRoot = schema.root
    .map((key) => nameToId[key])
    .filter((id): id is string => !!id);

  const mappedData: Record<string, unknown> = {};
  const mappedTargets = new Set<string>();

  // Pass 1: prefer backend name-keyed payload (canonical format).
  for (const [incomingKey, incomingValue] of Object.entries(data)) {
    const targetId = nameToId[incomingKey];
    if (!targetId) continue;

    const sourceEntity = schema.entities[incomingKey];
    mappedData[targetId] =
      sourceEntity?.type === EntityKey.toggleField
        ? normalizeToggleValue(incomingValue)
        : incomingValue;
    mappedTargets.add(targetId);
  }

  // Pass 2: support already-id-keyed payloads (backward compatibility).
  for (const [incomingKey, incomingValue] of Object.entries(data)) {
    if (!Object.prototype.hasOwnProperty.call(newEntities, incomingKey)) {
      continue;
    }
    if (mappedTargets.has(incomingKey)) {
      continue;
    }

    const sourceEntity = newEntities[incomingKey];
    mappedData[incomingKey] =
      sourceEntity?.type === EntityKey.toggleField
        ? normalizeToggleValue(incomingValue)
        : incomingValue;
    mappedTargets.add(incomingKey);
  }

  return {
    data: mappedData,
    schema: {
      root: newRoot,
      entities: newEntities,
    },
  };
}
