import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, EyeIcon, XIcon } from "lucide-react";

import {
  type BuilderStore,
  type EntitiesValues,
  type InterpreterStore,
  type Schema,
} from "@coltorapps/builder";
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { basicFormBuilder } from "./definition";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/tabs";
import { useToast } from "@ui/toast";
import {
  createVisibleEntityComponents,
  getHiddenEntityIds,
} from "@/utils/form-visibility";
import {
  buildZodErrors,
  getDynamicRequiredErrors,
} from "@/utils/dynamic-status-validation";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import { useSetAtom } from "jotai";
import { interpreterStoreAtom } from "@/store";

function Form(props: {
  interpreterStore: InterpreterStore<typeof basicFormBuilder>;
  onSubmit: () => void;
  onValidationFail: () => void;
}) {
  const { toast } = useToast();
  const setIStore = useSetAtom(interpreterStoreAtom);
  const hiddenEntityIds = useMemo(
    () => getHiddenEntityIds(props.interpreterStore.schema),
    [props.interpreterStore.schema],
  );
  const renderableEntityComponents = useMemo(
    () => createVisibleEntityComponents(hiddenEntityIds),
    [hiddenEntityIds],
  );
  const { executeCode } = useCodeHelper({
    formSchema: props.interpreterStore.schema,
    formData: {},
  });

  useEffect(() => {
    setIStore((prev) =>
      prev === props.interpreterStore ? prev : props.interpreterStore,
    );
  }, [props.interpreterStore, setIStore]);

  async function handleSubmit() {
    const result = await props.interpreterStore.validateEntitiesValues();
    const data = props.interpreterStore.getData();
    const dynamicRequiredErrors = getDynamicRequiredErrors({
      schema: props.interpreterStore.schema,
      values: data.entitiesValues,
      executeCode,
    });
    const hasDynamicRequiredErrors =
      Object.keys(dynamicRequiredErrors).length > 0;

    if (hasDynamicRequiredErrors) {
      props.interpreterStore.setEntitiesErrors(
        buildZodErrors(dynamicRequiredErrors),
      );
    }

    if (result.success && !hasDynamicRequiredErrors) {
      props.onSubmit();

      toast({
        title: (
          <span>
            <CheckCircle2 className="mr-2 inline text-green-500" /> Submission
            successful.
          </span>
        ),
      });
    } else {
      props.onValidationFail();
      toast({
        variant: "destructive",
        title: (
          <span>
            <AlertCircle className="text-destructive mr-2 inline" /> Validation
            failed.
          </span>
        ),
        description: "Please fill out the required fields.",
      });
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="grid gap-4 px-2 py-4"
      noValidate
    >
      <InterpreterEntities
        interpreterStore={props.interpreterStore}
        components={renderableEntityComponents}
      />
      <div className="flex justify-end">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}

function PreviewJsonCard(props: { json?: Record<string, unknown> }) {
  return (
    <pre className="w-1 text-xs min-h-28">
      {JSON.stringify(props.json, undefined, 2)}
    </pre>
  );
}

const tabs = {
  form: "form",
  values: "values",
  schema: "schema",
};

export function Preview(props: {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId?: string | null;
  onEntityError: (id: string) => void;
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

  const [previewValues, setPreviewValues] =
    useState<EntitiesValues<typeof basicFormBuilder>>();

  return (
    <div className="flex justify-end">
      <div className="prose-a:no-underline prose-a:font-medium flex gap-4">
        <Button
          onClick={() => {
            openPreview();
          }}
        >
          <EyeIcon className="mr-2 h-4 w-4" />
          Preview Form
        </Button>
      </div>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <Tabs
            items={[
              {
                key: "form",
                label: "Form",
                children: (
                  <Form
                    interpreterStore={interpreterStore}
                    onSubmit={() => close()}
                    onValidationFail={() => (submitAttemptedRef.current = true)}
                  />
                ),
              },
              {
                key: "values",
                label: "Values",
                children: <PreviewJsonCard json={previewValues} />,
              },
              {
                key: "schema",
                label: "Schema",
                children: <PreviewJsonCard json={schema} />,
              },
            ]}
            defaultValue="form"
            onTabChange={(tab) => {
              if (tab === "values") {
                setPreviewValues(interpreterStore.getEntitiesValues());
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
