import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";

import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import {
  extractReferencedFieldNames,
  getFieldIdByName,
} from "@/hooks/useCode/utils";
import { interpreterStoreAtom, runtimeApplicationAtom } from "@/store";

export type RuntimeStatusCode = "HD" | "SH" | "RQ" | "RO" | "DS";

export type RuntimeEntityStatus = {
  hidden: boolean;
  required: boolean;
  readonly: boolean;
  disabled: boolean;
  codes: RuntimeStatusCode[];
};

type EntityLike = {
  id: string;
  value?: unknown;
  attributes: Record<string, unknown>;
};

const STATUS_CODES = new Set<RuntimeStatusCode>(["HD", "SH", "RQ", "RO", "DS"]);

export function resolveRuntimeHidden(
  staticHide: unknown,
  codes: RuntimeStatusCode[],
): boolean {
  if (codes.includes("HD")) return true;
  if (codes.includes("SH")) return false;
  return Boolean(staticHide);
}

export function normalizeStatusCodes(value: unknown): RuntimeStatusCode[] {
  const rawCodes = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      rawCodes
        .map((code) => String(code).trim().toUpperCase())
        .filter((code): code is RuntimeStatusCode =>
          STATUS_CODES.has(code as RuntimeStatusCode),
        ),
    ),
  );
}

function getDependencyConfig(expressionCode: string, iStore: any) {
  if (!iStore || !expressionCode) {
    return { mode: "none" as const, dependencyIds: [] as string[] };
  }

  const hasGetFormFieldCall = /getFormField\s*\(/.test(expressionCode);
  const allGetFormFieldCalls =
    expressionCode.match(/getFormField\s*\(/g)?.length ?? 0;
  const staticGetFormFieldCalls =
    expressionCode.match(/getFormField\s*\(\s*["'][a-zA-Z0-9_-]+["']\s*\)/g)
      ?.length ?? 0;

  if (
    hasGetFormFieldCall &&
    (staticGetFormFieldCalls === 0 ||
      allGetFormFieldCalls !== staticGetFormFieldCalls)
  ) {
    return { mode: "broad" as const, dependencyIds: [] as string[] };
  }

  const referencedNames = extractReferencedFieldNames(expressionCode);
  if (referencedNames.length === 0) {
    return { mode: "none" as const, dependencyIds: [] as string[] };
  }

  const resolvedIds = referencedNames
    .map((name) => getFieldIdByName(iStore.schema.entities, name))
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (resolvedIds.length !== referencedNames.length) {
    return { mode: "broad" as const, dependencyIds: [] as string[] };
  }

  return {
    mode: "scoped" as const,
    dependencyIds: Array.from(new Set(resolvedIds)),
  };
}

export function useEntityRuntimeStatus(
  entity: EntityLike,
): RuntimeEntityStatus {
  const iStore = useAtomValue(interpreterStoreAtom);
  const runtimeApplication = useAtomValue(runtimeApplicationAtom);
  const [dependencyVersion, setDependencyVersion] = useState(0);
  const dynamicStatus = entity.attributes.dynamicStatus as
    | { enabled?: boolean; expression?: string }
    | undefined;
  const expressionCode =
    dynamicStatus?.enabled && dynamicStatus.expression?.trim()
      ? dynamicStatus.expression.trim()
      : "";

  const { executeCode } = useCodeHelper({
    formSchema: iStore?.schema ?? { root: [], entities: {} },
    formData: (iStore?.getEntitiesValues?.() ?? {}) as Record<string, unknown>,
    application: runtimeApplication,
  });

  const dependencyConfig = useMemo(
    () => getDependencyConfig(expressionCode, iStore),
    [expressionCode, iStore],
  );

  useEffect(() => {
    if (!iStore || !expressionCode || dependencyConfig.mode === "none") {
      return;
    }

    const unsubscribe = iStore.subscribe((_data: unknown, events: any[]) => {
      const updatedEntityIds = events
        .filter((event) => event?.name === "EntityValueUpdated")
        .map((event) => event?.payload?.entityId)
        .filter((id): id is string => typeof id === "string");

      if (updatedEntityIds.length === 0) return;
      if (updatedEntityIds.includes(entity.id)) return;
      if (
        dependencyConfig.mode === "scoped" &&
        !updatedEntityIds.some((id) =>
          dependencyConfig.dependencyIds.includes(id),
        )
      ) {
        return;
      }

      setDependencyVersion((value) => value + 1);
    });

    return unsubscribe;
  }, [
    dependencyConfig.dependencyIds,
    dependencyConfig.mode,
    entity.id,
    expressionCode,
    iStore,
  ]);

  const dynamicCodes = useMemo(() => {
    if (!expressionCode || !iStore) return [];

    try {
      return evaluateEntityRuntimeStatusCodes(entity, executeCode);
    } catch (error) {
      console.warn("Failed to evaluate dynamic status expression", error);
      return [];
    }
  }, [
    dependencyVersion,
    entity.id,
    entity.value,
    executeCode,
    expressionCode,
    iStore,
  ]);

  return {
    hidden: resolveRuntimeHidden(entity.attributes.hide, dynamicCodes),
    required:
      Boolean(entity.attributes.required) || dynamicCodes.includes("RQ"),
    readonly:
      Boolean(entity.attributes.readonly) || dynamicCodes.includes("RO"),
    disabled:
      Boolean(entity.attributes.disabled) || dynamicCodes.includes("DS"),
    codes: dynamicCodes,
  };
}

export function evaluateEntityRuntimeStatusCodes(
  entity: EntityLike,
  executeCode: (code: string) => unknown,
): RuntimeStatusCode[] {
  const dynamicStatus = entity.attributes.dynamicStatus as
    | { enabled?: boolean; expression?: string }
    | undefined;
  const expressionCode =
    dynamicStatus?.enabled && dynamicStatus.expression?.trim()
      ? dynamicStatus.expression.trim()
      : "";

  if (!expressionCode) return [];

  const executable = executeCode(expressionCode);
  const result =
    typeof executable === "function"
      ? executable(entity.value, { entityId: entity.id })
      : executable;
  return normalizeStatusCodes(result);
}
