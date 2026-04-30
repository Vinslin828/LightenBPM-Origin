import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { CirclePlusIcon, TrashIcon, ExportIcon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { NewTableModal } from "@/components/master-data/NewTableModal";
import type { MasterDataSourceType } from "@/components/master-data/NewTableModal";
import type { ExternalApiConfigValue } from "@/components/master-data/ExternalApiConfig";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCreateDataset,
  useDatasets,
  useDeleteDataset,
  useExportDatasetCsv,
} from "@/hooks/useDataset";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const MasterDataPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { datasets, totalPages, isLoading } = useDatasets({
    page,
    limit: pageSize,
  });
  const createDataset = useCreateDataset();
  const deleteDataset = useDeleteDataset();
  const exportCsv = useExportDatasetCsv();

  const filteredDatasets = useMemo(() => {
    if (!datasets || !Array.isArray(datasets)) return [];

    let items = [...datasets];
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      items = items.filter((dataset) => dataset.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      const aDate = new Date(a.updated_at ?? "").getTime() || 0;
      const bDate = new Date(b.updated_at ?? "").getTime() || 0;
      return sortAsc ? aDate - bDate : bDate - aDate;
    });

    return items;
  }, [datasets, debouncedSearch, sortAsc]);

  const handleCreateTableName = async (
    name: string,
    dataSource: MasterDataSourceType,
    externalApiConfig?: ExternalApiConfigValue,
  ) => {
    if (dataSource === "external_api" && externalApiConfig) {
      try {
        const result = await createDataset.mutateAsync({
          name,
          source_type: "EXTERNAL_API",
          fields: externalApiConfig.field_mappings.mappings.map((mapping) => ({
            name: mapping.field_name,
            type: "text",
            nullable: true,
          })),
          api_config: externalApiConfig.api_config,
          field_mappings: {
            records_path: externalApiConfig.field_mappings.records_path,
            mappings: externalApiConfig.field_mappings.mappings.map(
              ({ field_name, json_path }) => ({
                field_name,
                json_path,
              }),
            ),
          },
        });

        toast({
          variant: "success",
          title: t("master_data.table_created"),
        });
        setShowModal(false);

        if (result.data?.code) {
          navigate(`/master-data/${result.data.code}`);
        }
      } catch {
        return false;
      }

      return true;
    }

    try {
      const result = await createDataset.mutateAsync({ name, fields: [] });
      toast({
        variant: "success",
        title: t("master_data.table_created"),
      });
      setShowModal(false);
      if (result.data?.code) {
        navigate(`/master-data/${result.data.code}?addColumn=true`);
      }
    } catch {
      return false;
    }
    return true;
  };

  const handleDeleteClick = (code: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteCode(code);
  };

  const handleExportClick = async (
    code: string,
    name: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    try {
      const blob = await exportCsv.mutateAsync(code);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ variant: "success", title: t("master_data.export_success") });
    } catch {
      toast({ variant: "destructive", title: t("master_data.export_failed") });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCode) return;

    try {
      await deleteDataset.mutateAsync(deleteCode);
      toast({
        variant: "success",
        title: t("master_data.delete"),
      });
      setDeleteCode(null);
    } catch {
      // Error handled by global mutation error handler
    }
  };

  const isEmpty = !isLoading && (!datasets || datasets.length === 0);

  return (
    <div className="flex flex-col p-6 bg-gray-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-text">
          {t("master_data.title")}
        </h1>
        <Button
          onClick={() => setShowModal(true)}
          icon={<CirclePlusIcon className="h-5 w-5" />}
        >
          {t("master_data.new_table")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-secondary-text">{t("loading")}</span>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("master_data.search_table_name")}
              hasClearIcon
              className="max-w-md bg-white"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-secondary-text w-full">
                    {t("master_data.name")}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-secondary-text min-w-32">
                    <button
                      className="inline-flex w-full items-center justify-center gap-1 hover:text-primary-text min-w-30"
                      onClick={() => setSortAsc((value) => !value)}
                    >
                      {t("master_data.update_date")}
                      <span className="text-xs">{sortAsc ? "↑" : "↓"}</span>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-secondary-text min-w-32">
                    {t("master_data.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDatasets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-secondary-text"
                    >
                      {isEmpty ? (
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-lg font-semibold text-secondary-text">
                            {t("master_data.no_data")}
                          </p>
                          <p className="text-sm text-secondary-text">
                            {t("master_data.no_data_description_start")}{" "}
                            <button
                              onClick={() => setShowModal(true)}
                              className="font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                            >
                              {t("master_data.no_data_here")}
                            </button>{" "}
                            {t("master_data.no_data_description_end")}
                          </p>
                        </div>
                      ) : (
                        t("master_data.no_matching_records")
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDatasets.map((dataset) => (
                    <tr
                      key={dataset.code}
                      className="cursor-pointer border-b border-stroke last:border-b-0 transition-colors hover:bg-gray-50"
                      onClick={() => navigate(`/master-data/${dataset.code}`)}
                    >
                      <td className="px-6 py-4 text-dark gap-1.5">
                        <span className="font-body-meduim-meduim">
                          {dataset.name}
                        </span>
                        {dataset.source_type === "EXTERNAL_API" ? (
                          <span className="mx-2.5 px-3 py-1 bg-gray-100 rounded inline-flex justify-center items-center text-slate-400 font-body-small-medium text-sm">
                            External API
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-center font-body-meduim-meduim text-dark min-w-32">
                        {dataset.updated_at
                          ? new Date(dataset.updated_at).toLocaleDateString(
                              "en-CA",
                            )
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right min-w-32">
                        {dataset.source_type !== "EXTERNAL_API" ? (
                          <button
                            onClick={(event) =>
                              handleExportClick(
                                dataset.code,
                                dataset.name,
                                event,
                              )
                            }
                            className="inline-flex items-center justify-center rounded-md p-2 text-secondary-text transition-colors hover:bg-gray-100 hover:text-lighten-blue cursor-pointer"
                            disabled={exportCsv.isPending}
                          >
                            <ExportIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={(event) =>
                            handleDeleteClick(dataset.code, event)
                          }
                          className="inline-flex items-center justify-center rounded-md p-2 text-secondary-text transition-colors hover:bg-gray-100 hover:text-red-500 cursor-pointer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!debouncedSearch.trim() && (
            <Pagination
              totalPages={totalPages}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      <Dialog
        open={!!deleteCode}
        onOpenChange={(open) => !open && setDeleteCode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("master_data.delete_table_title")}</DialogTitle>
            <DialogDescription>
              {t("master_data.delete_table_confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setDeleteCode(null)}>
              {t("buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteDataset.isPending}
            >
              {t("buttons.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewTableModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateTableName}
      />
    </div>
  );
};
