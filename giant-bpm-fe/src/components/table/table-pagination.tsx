import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

export default function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: TablePaginationProps) {
  const { t } = useTranslation();
  const safeCurrentPage = clampPage(currentPage, Math.max(totalPages, 1));
  const safePageSize = Math.max(1, pageSize);
  const hasItems = totalItems > 0;

  const start = hasItems ? (safeCurrentPage - 1) * safePageSize + 1 : 0;
  const end = hasItems
    ? Math.min(safeCurrentPage * safePageSize, totalItems)
    : 0;

  const goPrev = () => {
    if (safeCurrentPage <= 1) return;
    onPageChange(safeCurrentPage - 1);
  };
  const goNext = () => {
    if (safeCurrentPage >= totalPages) return;
    onPageChange(safeCurrentPage + 1);
  };

  const handlePageSizeChange = (nextSize: number) => {
    if (!Number.isFinite(nextSize) || nextSize <= 0) return;
    onPageSizeChange?.(nextSize);
    onPageChange(1);
  };

  return (
    <div className="self-stretch border-t border-stroke bg-gray-100 px-4 py-1 md:px-6">
      <div className="flex items-center justify-end gap-4 md:gap-6">
        <label className="flex items-center gap-2 text-xs text-primary-text">
          <span>{t("table.rows_per_page", { defaultValue: "Rows per page:" })}</span>
          <span className="relative inline-flex items-center rounded-md border border-stroke bg-white px-2 py-1">
            <select
              aria-label={t("table.rows_per_page", {
                defaultValue: "Rows per page:",
              })}
              value={String(safePageSize)}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              disabled={!onPageSizeChange}
              className={cn(
                "appearance-none bg-transparent pr-5 text-xs text-dark focus:outline-none",
                onPageSizeChange ? "cursor-pointer" : "cursor-not-allowed",
              )}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 h-4 w-4 text-primary-text" />
          </span>
        </label>

        <div className="text-xs text-dark">
          {start}-{end} {t("table.of", { defaultValue: "of" })} {totalItems}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={goPrev}
            disabled={safeCurrentPage <= 1}
            aria-label={t("table.previous_page", { defaultValue: "Previous page" })}
            className={cn(
              "rounded-full p-2",
              safeCurrentPage <= 1
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-gray-200",
            )}
          >
            <ChevronLeft className="h-5 w-5 text-primary-text" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={safeCurrentPage >= totalPages}
            aria-label={t("table.next_page", { defaultValue: "Next page" })}
            className={cn(
              "rounded-full p-2",
              safeCurrentPage >= totalPages
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-gray-200",
            )}
          >
            <ChevronRight className="h-5 w-5 text-primary-text" />
          </button>
        </div>
      </div>
    </div>
  );
}
