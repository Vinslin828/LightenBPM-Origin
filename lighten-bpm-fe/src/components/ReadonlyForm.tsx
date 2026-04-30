import { useEffect, useMemo } from "react";
import { Application } from "@/types/application";
import { EntityKey } from "@/types/form-builder";
import dayjs from "dayjs";
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";
import { entitiesComponents } from "@/const/form-builder";
import { basicFormBuilder } from "./form/builder/definition";
import { usePreloadMasterDataForExpressions } from "@/hooks/useMasterData";
import { useSetAtom } from "jotai";
import { runtimeApplicationAtom } from "@/store";

export default function ReadonlyForm({ formInstance, ...props }: Application) {
  const { form, data } = formInstance;
  const setRuntimeApplication = useSetAtom(runtimeApplicationAtom);

  // const builderStore = useBuilderStore(basicFormBuilder, {
  //   initialData: formInstance.form.schema,
  // });

  console.debug({ formInstance });
  const readonlySchema = useMemo(() => {
    const entities = Object.fromEntries(
      Object.entries(form.schema.entities ?? {}).map(([entityId, entity]) => {
        const current = entity as typeof entity & {
          attributes?: Record<string, unknown>;
          type?: string;
        };
        const attributes = current.attributes ?? {};
        const shouldForceReadonly =
          "readonly" in attributes || current.type === EntityKey.grid;
        const nextAttributes =
          shouldForceReadonly
            ? {
                ...attributes,
                readonly: true,
              }
            : attributes;

        return [
          entityId,
          {
            ...current,
            attributes: nextAttributes,
          },
        ];
      }),
    ) as typeof form.schema.entities;

    return {
      ...form.schema,
      entities,
    } as typeof form.schema;
  }, [form.schema]);

  usePreloadMasterDataForExpressions(readonlySchema);

  const interpreterStore = useInterpreterStore(basicFormBuilder, readonlySchema);

  useEffect(() => {
    interpreterStore.setData({
      entitiesValues: formInstance.data,
      entitiesErrors: {},
    });
  }, [formInstance.data, interpreterStore]);

  useEffect(() => {
    setRuntimeApplication({
      ...props,
      formInstance,
    } as Application);
  }, [formInstance, props, setRuntimeApplication]);

  return (
    <dl className="flex flex-col gap-6">
      <InterpreterEntities
        interpreterStore={interpreterStore}
        components={entitiesComponents}
      />
    </dl>
  );
}
