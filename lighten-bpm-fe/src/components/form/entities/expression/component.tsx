import { createEntityComponent } from "@coltorapps/builder-react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo } from "react";

import { Label } from "@/components/ui/label";
import { interpreterStoreAtom, runtimeApplicationAtom } from "@/store";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import {
  extractReferencedFieldNames,
  getFieldIdByName,
} from "@/hooks/useCode/utils";
import { expressionFieldEntity } from "./definition";

const areValuesEqual = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) {
    return true;
  }

  if (
    typeof a === "object" &&
    a !== null &&
    typeof b === "object" &&
    b !== null
  ) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
};

export const ExpressionFieldEntity = createEntityComponent(
  expressionFieldEntity,
  function ExpressionFieldEntity(props) {
    const iStore = useAtomValue(interpreterStoreAtom);
    const runtimeApplication = useAtomValue(runtimeApplicationAtom);
    const { executeCode } = useCodeHelper({
      formSchema: iStore?.schema ?? { root: [], entities: {} },
      formData: (iStore?.getEntitiesValues?.() ?? {}) as Record<
        string,
        unknown
      >,
      application: runtimeApplication,
    });

    const label = !!props.entity.attributes.label.value
      ? props.entity.attributes.label.value
      : props.entity.attributes.name;

    const displayValue =
      props.entity.value === undefined || props.entity.value === null
        ? ""
        : String(props.entity.value);
    const expressionCode = props.entity.attributes.expression?.trim() ?? "";

    const dependencyConfig = useMemo(() => {
      if (!iStore || !expressionCode) {
        return {
          mode: "none" as const,
          dependencyIds: [] as string[],
        };
      }

      const hasGetFormFieldCall = /getFormField\s*\(/.test(expressionCode);
      const allGetFormFieldCalls =
        expressionCode.match(/getFormField\s*\(/g)?.length ?? 0;
      const staticGetFormFieldCalls =
        expressionCode.match(/getFormField\s*\(\s*["'][a-zA-Z0-9_-]+["']\s*\)/g)
          ?.length ?? 0;

      // If some getFormField(...) calls are not literal strings, subscribe broadly for safety.
      if (
        hasGetFormFieldCall &&
        (staticGetFormFieldCalls === 0 ||
          allGetFormFieldCalls !== staticGetFormFieldCalls)
      ) {
        return {
          mode: "broad" as const,
          dependencyIds: [] as string[],
        };
      }

      const referencedNames = extractReferencedFieldNames(expressionCode);

      if (referencedNames.length === 0) {
        return {
          mode: "none" as const,
          dependencyIds: [] as string[],
        };
      }

      const resolvedIds = referencedNames
        .map((name) => getFieldIdByName(iStore.schema.entities, name))
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      // If any extracted reference cannot be resolved, subscribe broadly for correctness.
      if (resolvedIds.length !== referencedNames.length) {
        return {
          mode: "broad" as const,
          dependencyIds: [] as string[],
        };
      }

      return {
        mode: "scoped" as const,
        dependencyIds: Array.from(new Set(resolvedIds)),
      };
    }, [expressionCode, iStore]);

    const evaluateExpression = useCallback(() => {
      if (!expressionCode || !iStore) {
        return "";
      }

      try {
        const executable = executeCode(expressionCode);

        return typeof executable === "function"
          ? executable(props.entity.value)
          : executable;
      } catch (error) {
        console.warn("Failed to evaluate expression entity code", error);
        return "";
      }
    }, [executeCode, expressionCode, iStore, props.entity.value]);

    useEffect(() => {
      if (!iStore) {
        return;
      }

      const syncExpressionValue = () => {
        const evaluatedValue = evaluateExpression();
        const nextValue = evaluatedValue === undefined ? "" : evaluatedValue;
        if (!areValuesEqual(nextValue, props.entity.value)) {
          props.setValue(nextValue);
        }
      };

      syncExpressionValue();

      if (dependencyConfig.mode === "none") {
        return;
      }

      const unsubscribe = iStore.subscribe((_data: unknown, events: any[]) => {
        const updatedEntityIds = events
          .filter((event) => event?.name === "EntityValueUpdated")
          .map((event) => event?.payload?.entityId)
          .filter((id): id is string => typeof id === "string");

        if (updatedEntityIds.length === 0) {
          return;
        }

        if (updatedEntityIds.includes(props.entity.id)) {
          return;
        }

        if (
          dependencyConfig.mode === "scoped" &&
          !updatedEntityIds.some((id) =>
            dependencyConfig.dependencyIds.includes(id),
          )
        ) {
          return;
        }

        syncExpressionValue();
      });

      return unsubscribe;
    }, [
      dependencyConfig.dependencyIds,
      dependencyConfig.mode,
      evaluateExpression,
      iStore,
      props.entity.id,
      props.entity.value,
      props.setValue,
    ]);

    return (
      <div className="w-full">
        <Label htmlFor={props.entity.attributes.name || props.entity.id}>
          {label}
        </Label>
        <div
          id={props.entity.attributes.name || props.entity.id}
          className="w-full min-h-12 rounded-[6px] border border-stroke bg-gray-2 px-5 py-3 text-dark"
        >
          {displayValue}
        </div>
      </div>
    );
  },
);
