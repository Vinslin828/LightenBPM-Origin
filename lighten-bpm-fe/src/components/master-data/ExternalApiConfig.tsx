import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTestExternalApi } from "@/hooks/useMasterData";
import HighlightCodeTextarea from "@/components/ui/highlight-code-textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import { ExternalApiRequestConfig } from "@/types/master-data-dataset";
import { TrashIcon } from "../icons";

export type ExternalApiFieldMapping = {
  isNew?: boolean;
  id: string;
  field_name: string;
  json_path: string;
};

export type ExternalApiConfigValue = {
  api_config: ExternalApiRequestConfig;
  field_mappings: {
    records_path: string;
    mappings: ExternalApiFieldMapping[];
  };
};

const EMPTY_API_CONFIG: ExternalApiRequestConfig = {
  url: "",
  method: "GET",
};

const EXAMPLE_API_CONFIG: ExternalApiRequestConfig = {
  url: "https://jsonplaceholder.typicode.com/users",
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

const DEFAULT_API_CONFIG_COMMENTED = stringifyApiConfig(EXAMPLE_API_CONFIG)
  .split("\n")
  .map((line) => `// ${line}`)
  .join("\n");

const createMapping = (
  overrides: Partial<ExternalApiFieldMapping> = {},
): ExternalApiFieldMapping => ({
  isNew: true,
  id: globalThis.crypto?.randomUUID?.() ?? `mapping-${Date.now()}`,
  field_name: "",
  json_path: "",
  ...overrides,
});

export const createDefaultExternalApiConfig = (): ExternalApiConfigValue => ({
  api_config: EMPTY_API_CONFIG,
  field_mappings: {
    records_path: "",
    mappings: [],
  },
});

type ExternalApiConfigProps = {
  tableName: string;
  value: ExternalApiConfigValue;
  onChange: (value: ExternalApiConfigValue) => void;
  onCancel: () => void;
  onBack: () => void;
  onCreate: () => void;
  title?: string;
  createLabel?: string;
  backLabel?: string;
  isEditMode?: boolean;
};

type CodePanelProps = {
  value: string;
  onChange?: (value: string) => void;
  minLines?: number;
  placeholder?: string;
  readOnly?: boolean;
  dark?: boolean;
  className?: string;
};

function CodePanel({
  value,
  onChange,
  minLines = 12,
  placeholder,
  readOnly = false,
  dark = false,
  className,
}: CodePanelProps) {
  const numbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = useMemo(() => {
    const lines = value ? value.split("\n").length : 1;
    return Math.max(lines, minLines);
  }, [value, minLines]);

  const handleScroll = () => {
    if (!numbersRef.current || !textareaRef.current) return;
    numbersRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-lg border p-5",
        dark ? "border-dark-3 bg-dark text-white" : "border-stroke bg-gray-2",
        className,
      )}
    >
      <div
        ref={numbersRef}
        className={cn(
          "pr-4 text-xs leading-5 font-mono select-none overflow-hidden",
          dark ? "text-dark-6" : "text-secondary-text",
        )}
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index + 1}>{index + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className={cn(
          "min-h-0 flex-1 resize-none bg-transparent text-sm leading-5 font-mono outline-none",
          dark
            ? "text-white placeholder:text-dark-6"
            : "text-dark placeholder:text-secondary-text",
          readOnly && "cursor-default",
        )}
      />
    </div>
  );
}

function stringifyApiConfig(apiConfig: ExternalApiRequestConfig) {
  return JSON.stringify(apiConfig, null, 2);
}

const stripCommentLines = (value: string) =>
  value
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .trim();

const formatApiConfigForEditor = (apiConfig: ExternalApiRequestConfig) =>
  stringifyApiConfig(apiConfig) === stringifyApiConfig(EMPTY_API_CONFIG)
    ? DEFAULT_API_CONFIG_COMMENTED
    : stringifyApiConfig(apiConfig);

const parseApiConfig = (value: string): ExternalApiRequestConfig => {
  const parsed = JSON.parse(value) as ExternalApiRequestConfig;
  const method = parsed.method ?? "GET";
  return {
    url: parsed.url ?? "",
    method: ["GET", "POST", "PUT"].includes(method) ? method : "GET",
    headers: parsed.headers ?? undefined,
    body: parsed.body ?? undefined,
  };
};

export const ExternalApiConfig = ({
  tableName,
  value,
  onChange,
  onCancel,
  onBack,
  onCreate,
  title = "New Table",
  createLabel = "Create",
  backLabel = "Back",
  isEditMode = false,
}: ExternalApiConfigProps) => {
  const [apiConfigText, setApiConfigText] = useState(() =>
    formatApiConfigForEditor(value.api_config),
  );
  const [testResponse, setTestResponse] = useState("");
  const [apiConfigError, setApiConfigError] = useState("");
  const [editMode, setEditMode] = useState(isEditMode);
  const testExternalApi = useTestExternalApi();

  useEffect(() => {
    setApiConfigText(formatApiConfigForEditor(value.api_config));
  }, [value.api_config]);

  const updateValue = (updates: Partial<ExternalApiConfigValue>) => {
    onChange({ ...value, ...updates });
  };

  const updateMapping = (
    mappingId: string,
    field: keyof Omit<ExternalApiFieldMapping, "id">,
    nextValue: string,
  ) => {
    updateValue({
      field_mappings: {
        ...value.field_mappings,
        mappings: value.field_mappings.mappings.map((mapping) =>
          mapping.id === mappingId
            ? { ...mapping, [field]: nextValue }
            : mapping,
        ),
      },
    });
  };

  const addMapping = () => {
    updateValue({
      field_mappings: {
        ...value.field_mappings,
        mappings: [...value.field_mappings.mappings, createMapping()],
      },
    });
  };

  const removeMapping = (mappingId: string) => {
    updateValue({
      field_mappings: {
        ...value.field_mappings,
        mappings:
          value.field_mappings.mappings.length === 1
            ? [createMapping()]
            : value.field_mappings.mappings.filter(
                (mapping) => mapping.id !== mappingId,
              ),
      },
    });
  };

  const handleApiConfigChange = (nextValue: string) => {
    setApiConfigText(nextValue);

    const meaningfulValue = stripCommentLines(nextValue);
    if (!meaningfulValue) {
      updateValue({ api_config: EMPTY_API_CONFIG });
      setApiConfigError("");
      return;
    }

    try {
      const nextApiConfig = parseApiConfig(meaningfulValue);
      updateValue({ api_config: nextApiConfig });
      setApiConfigError("");
    } catch {
      setApiConfigError("API config must be valid JSON.");
    }
  };

  const handleRunTest = async () => {
    try {
      const response = await testExternalApi.mutateAsync(value.api_config);
      setTestResponse(JSON.stringify(response.data ?? null, null, 2));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to test external API.";
      setTestResponse(JSON.stringify({ error: message }, null, 2));
    }
  };

  const isCreateDisabled =
    !tableName.trim() ||
    !value.api_config.url.trim() ||
    !!apiConfigError ||
    value.field_mappings.mappings.some(
      (mapping) => !mapping.field_name.trim() || !mapping.json_path.trim(),
    );
  const hasApiResponse = Boolean(testResponse.trim());

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-7 overflow-hidden bg-white p-7">
      <h2 className="text-2xl font-semibold text-dark">{title}</h2>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid min-h-full gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-5 overflow-hidden">
            <div className="text-lg font-semibold text-dark">
              API Configuration
            </div>

            <div className="flex flex-col gap-2.5">
              <Label className="pb-0 text-base text-dark">External API</Label>
              <HighlightCodeTextarea
                value={apiConfigText}
                onChange={handleApiConfigChange}
                minLines={10}
                placeholder="Type here..."
                language="json"
                className="min-h-48"
              />
              {apiConfigError ? (
                <p className="text-sm text-red">{apiConfigError}</p>
              ) : (
                <p className="text-sm text-primary-text">
                  Define `api_config` as documented: `url`, `method`, optional
                  `headers`, and optional `body`.
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <div className="flex items-center justify-between gap-4">
                <Label className="pb-0 text-base text-dark">
                  Test API Response
                </Label>
                <button
                  type="button"
                  onClick={handleRunTest}
                  className="inline-flex items-center gap-1.5 text-base font-medium text-lighten-blue"
                  disabled={!!apiConfigError || testExternalApi.isPending}
                >
                  <Play className="h-4 w-4 fill-current" />
                  {testExternalApi.isPending ? "Running..." : "Run test"}
                </button>
              </div>

              <CodePanel
                value={testResponse}
                readOnly
                dark
                minLines={16}
                className="max-h-[400px] flex-1"
              />
            </div>
          </div>

          <div className="hidden bg-stroke lg:block" />

          <div className="flex min-h-0 flex-col gap-5 overflow-hidden">
            <div className="text-lg font-semibold text-dark">
              Field Mappings
            </div>

            <div className="flex flex-col gap-2.5">
              <Label className="pb-0 text-base text-dark">Records path</Label>
              <div className="flex flex-col gap-[5px]">
                <Input
                  value={value.field_mappings.records_path}
                  // disabled={isEditMode}
                  onChange={(event) =>
                    updateValue({
                      field_mappings: {
                        ...value.field_mappings,
                        records_path: event.target.value,
                      },
                    })
                  }
                  placeholder="Please type in the path to an array of data"
                />
                <p className="text-sm text-primary-text">
                  Dot-notation path to the records array. Leave empty if the
                  response is already an array.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-lg font-semibold text-dark">Mappings</div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_44px] items-center gap-2.5">
                <div className="text-base font-medium text-dark">
                  Dataset field
                </div>
                <div />
                <div className="text-base font-medium text-dark">JSON path</div>
                <div />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {value.field_mappings.mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_44px] items-center gap-2.5"
                  >
                    <Input
                      value={mapping.field_name}
                      // disabled={isEditMode && !mapping.isNew}
                      onChange={(event) =>
                        updateMapping(
                          mapping.id,
                          "field_name",
                          event.target.value,
                        )
                      }
                      placeholder="column_name"
                    />
                    <ArrowRight className="h-4 w-4 justify-self-center text-secondary-text" />
                    <Input
                      value={mapping.json_path}
                      onChange={(event) =>
                        updateMapping(
                          mapping.id,
                          "json_path",
                          event.target.value,
                        )
                      }
                      // disabled={isEditMode && !mapping.isNew}
                      placeholder="response_path"
                    />

                    {
                      <Button
                        type="button"
                        variant="icon"
                        size="icon"
                        className="h-11 w-11"
                        onClick={() => removeMapping(mapping.id)}
                        aria-label="Remove mapping"
                      >
                        <TrashIcon className="h-6 w-6 text-primary-text" />
                      </Button>
                    }
                  </div>
                ))}
                {hasApiResponse && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-3 w-fit text-lighten-blue"
                    onClick={addMapping}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add mapping
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap justify-center gap-4">
        <Button variant="tertiary" className="w-48" onClick={onCancel}>
          Cancel
        </Button>
        {!isEditMode && (
          <Button variant="secondary" className="w-48" onClick={onBack}>
            {backLabel}
          </Button>
        )}
        <Button className="w-48" onClick={onCreate} disabled={isCreateDisabled}>
          {createLabel}
        </Button>
      </div>
    </div>
  );
};
