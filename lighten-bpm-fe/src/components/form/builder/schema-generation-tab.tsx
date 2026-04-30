import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  type BuilderStore,
  type EntitiesValues,
  type Schema,
} from "@coltorapps/builder";
import { useInterpreterStore } from "@coltorapps/builder-react";

import { basicFormBuilder } from "./definition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@ui/toast";
import { deparseFormSchema, parseFormSchema } from "@/utils/parser";

function PreviewJsonCard(props: { json?: Record<string, unknown> }) {
  return (
    <pre className="w-full min-h-28 text-xs bg-gray-100 p-4 rounded-md overflow-x-auto">
      {JSON.stringify(props.json, undefined, 2)}
    </pre>
  );
}

const tabs = {
  form: "form",
  values: "values",
  schema: "schema",
};

export function SchemaGenerationTab(props: {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId?: string | null;
  onEntityError: (id: string) => void;
  valuesJson: EntitiesValues<typeof basicFormBuilder>;
}) {
  const { toast } = useToast();
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  // const [previewVisible, setPreviewVisible] = useState(false)

  const [schema, setSchema] = useState<Schema<typeof basicFormBuilder>>();

  const submitAttemptedRef = useRef(false);

  const interpreterStore = useInterpreterStore(
    basicFormBuilder,
    schema ?? { entities: {}, root: [] },
    {
      events: {
        onEntityValueUpdated(payload) {
          if (submitAttemptedRef.current) {
            void interpreterStore.validateEntityValue(payload.entityId);
          }
        },
      },
    },
  );

  if (schema) {
    console.debug(parseFormSchema(schema));
    console.debug(deparseFormSchema(parseFormSchema(schema)));
  }

  async function openPreview() {
    const result = await props.builderStore.validateSchema();

    if (result.success) {
      open();
      setSchema(result.data);
      return;
    }

    if (
      result.reason.code === "InvalidEntitiesAttributes" &&
      props.activeEntityId &&
      !result.reason.payload.entitiesAttributesErrors[props.activeEntityId]
    ) {
      props.onEntityError(
        Object.keys(result.reason.payload.entitiesAttributesErrors)[0],
      );
    }

    toast({
      title: (
        <span>
          <AlertCircle className="text-destructive mr-2 inline" /> Please fix
          the highlighted errors.
        </span>
      ),
    });
  }

  useEffect(() => {
    const result = props.builderStore
      .validateSchema()
      .then((result) => {
        if (result.success) {
          setSchema(result.data);
          return;
        }
        if (
          result.reason.code === "InvalidEntitiesAttributes" &&
          props.activeEntityId &&
          !result.reason.payload.entitiesAttributesErrors[props.activeEntityId]
        ) {
          props.onEntityError(
            Object.keys(result.reason.payload.entitiesAttributesErrors)[0],
          );
        }
      })
      .catch((e) => {
        toast({
          title: (
            <span>
              <AlertCircle className="text-destructive mr-2 inline" /> Please
              fix the highlighted errors.
            </span>
          ),
        });
      });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-2">
      <Card>
        <CardHeader>
          <CardTitle>Values</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewJsonCard json={props.valuesJson} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schemas</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewJsonCard json={schema} />
        </CardContent>
      </Card>
    </div>
  );
}
