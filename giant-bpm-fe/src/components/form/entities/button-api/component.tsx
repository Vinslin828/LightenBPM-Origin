import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createEntityComponent } from "@coltorapps/builder-react";
import { buttonApiEntity } from "./definition";
import apiCaller from "@/utils/api-caller";
import { useCallback, useMemo, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

export const ButtonApiEntity = createEntityComponent(
  buttonApiEntity,
  function ButtonApiEntity(props) {
    const rawResult = props.entity.value as string | undefined;
    const apiResult = useMemo(() => {
      if (rawResult && rawResult.trim()) {
        try {
          return JSON.parse(rawResult);
        } catch {
          return rawResult;
        }
      }
      return rawResult;
    }, [rawResult]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const label = props.entity.attributes.label?.value?.trim()
      ? props.entity.attributes.label.value
      : props.entity.attributes.name;

    const buttonText =
      typeof props.entity.attributes.buttonText === "string" &&
      props.entity.attributes.buttonText.trim()
        ? props.entity.attributes.buttonText
        : "Fetch Data";

    const apiCodeAttr = props.entity.attributes.apiCode as
      | { returnType?: string; code?: string }
      | undefined;
    const returnType = apiCodeAttr?.returnType ?? "text";

    const handleClick = useCallback(async () => {
      const rawCode = apiCodeAttr?.code;
      if (!rawCode) return;

      const codeStr =
        rawCode.includes("{") && rawCode.includes("}")
          ? rawCode.substring(
              rawCode.indexOf("{") + 1,
              rawCode.lastIndexOf("}"),
            )
          : rawCode;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiCaller.post("/execution/fetch", {
          function: codeStr,
        });

        const dataToStore =
          typeof response.data === "object"
            ? JSON.stringify(response.data)
            : String(response.data);

        props.setValue(dataToStore);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to execute API code";
        console.error("Failed to execute API code:", err);
        setError(message);
        props.setValue(undefined);
      } finally {
        setIsLoading(false);
      }
    }, [apiCodeAttr?.code, returnType, props]);

    // Renders the grid based on the array of objects
    const renderGrid = (data: Record<string, unknown>[]) => {
      if (!Array.isArray(data) || data.length === 0) return null;

      const keys = Object.keys(data[0]).filter((k) => k !== "id");

      const columns: GridColDef[] = keys.map((key) => ({
        field: key,
        headerName: key,
        flex: 1,
        minWidth: 100,
      }));

      const rows = data.map((row, index) => ({
        id: (row as Record<string, unknown>).id ?? index,
        ...row,
      }));

      return (
        <div className="mt-4">
          <DataGrid
            rows={rows}
            columns={columns}
            hideFooter
            disableColumnSelector
            rowSelection={false}
          />
        </div>
      );
    };

    const renderResult = () => {
      if (apiResult === null || apiResult === undefined) return null;

      if (returnType === "text") {
        return (
          <p className="mt-4 font-body-medium-regular text-dark">
            {String(apiResult)}
          </p>
        );
      }

      if (returnType === "richText") {
        if (typeof apiResult === "string") {
          return (
            <div
              className="mt-4"
              dangerouslySetInnerHTML={{ __html: apiResult }}
            />
          );
        }
        if (typeof apiResult === "object" && apiResult !== null) {
          if (Array.isArray(apiResult) && typeof apiResult[0] === "object") {
            return renderGrid(apiResult as Record<string, unknown>[]);
          }
          return (
            <div className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-auto">
              <pre>{JSON.stringify(apiResult, null, 2)}</pre>
            </div>
          );
        }
        return <div className="mt-4">{String(apiResult)}</div>;
      }

      if (returnType === "grid") {
        const gridData = Array.isArray(apiResult)
          ? (apiResult as Record<string, unknown>[])
          : [apiResult as Record<string, unknown>];
        return renderGrid(gridData);
      }

      return null;
    };

    return (
      <div className="w-full">
        <Label>{label}</Label>
        <div className="mt-1 flex gap-[16px] items-center">
          <Button
            type="button"
            variant="tertiary"
            onClick={handleClick}
            disabled={isLoading || props.entity.attributes.readonly}
            aria-label={`Open ${label}`}
          >
            {isLoading ? "Loading..." : buttonText}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {!props.entity.attributes.hideResponseData && renderResult()}
      </div>
    );
  },
);
