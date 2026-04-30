import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { PaginatedData } from "@/types/domain";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  totalPages?: number;
  page?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Pagination UI that matches the Figma design:
 * - 44x44px buttons (h-11 w-11)
 * - 6px radius (rounded-[6px])
 * - active: #1A75E0 with white text
 * - inactive: white background, text #637381
 * - arrow buttons have a subtle border (#dfe4ea)
 */
export default function Pagination({
  totalPages,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const [internalPage, setInternalPage] = useState(
    clampPage(page, totalPages ?? 1),
  );

  useEffect(() => {
    setInternalPage(clampPage(page, totalPages ?? 1));
  }, [page, totalPages]);

  const currentPage = clampPage(internalPage, totalPages ?? 1);

  const goto = (p: number) => {
    const next = clampPage(p, totalPages ?? 1);
    setInternalPage(next);
    if (next !== page) {
      onPageChange(next);
    }
  };

  const handlePageSize = (s: number) => {
    onPageSizeChange?.(s);
    // typical UX: when page size changes reset to first page
    setInternalPage(1);
    onPageChange(1);
  };

  const pages = usePagination({
    page: currentPage,
    totalPages: totalPages ?? 1,
    siblingCount: 1,
  });

  if (!totalPages) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 px-2 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {/* Optional page size selector */}
        {onPageSizeChange && (
          <select
            aria-label="Rows per page"
            value={String(pageSize)}
            onChange={(e) => handlePageSize(Number(e.target.value))}
            className="text-sm text-[#637381] bg-white border border-transparent"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Left arrow */}
        <button
          aria-label="Previous page"
          onClick={() => goto(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "flex items-center justify-center h-11 w-11 rounded-md border border-stroke bg-white",
            currentPage <= 1
              ? "opacity-60 cursor-not-allowed"
              : "hover:shadow-sm",
          )}
        >
          <ChevronLeft className="h-4 w-4 text-primary-text" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-2">
          {pages.map((p, idx) =>
            p === "..." ? (
              <div
                key={`dot-${idx}`}
                className="flex items-center justify-center h-11 w-11 rounded-[6px]"
              >
                <span className="text-[#637381] text-[14px] font-medium">
                  …
                </span>
              </div>
            ) : (
              <button
                key={p}
                onClick={() => goto(Number(p))}
                aria-current={p === currentPage ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center h-11 w-11 rounded-[6px]",
                  p === currentPage
                    ? "bg-[#1a75e0] text-white"
                    : "text-primary-text",
                )}
              >
                <span className="text-[14px] font-medium leading-[22px]">
                  {p}
                </span>
              </button>
            ),
          )}
        </div>

        {/* Right arrow */}
        <button
          aria-label="Next page"
          onClick={() => goto(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            "flex items-center justify-center h-11 w-11 rounded-md border border-stroke bg-white",
            currentPage >= totalPages
              ? "opacity-60 cursor-not-allowed"
              : "hover:shadow-sm",
          )}
        >
          <ChevronRight className="h-4 w-4 text-primary-text" />
        </button>
      </div>
    </div>
  );
}

interface UsePaginationParams {
  page: number;
  totalPages: number;
  siblingCount?: number; // how many pages to show on each side
}

export function usePagination({
  page,
  totalPages,
  siblingCount = 1,
}: UsePaginationParams) {
  // Return an array of pages and "..." markers where appropriate
  const range: (number | "...")[] = [];

  console.debug({ totalPages });

  const totalPageNumbers = siblingCount * 2 + 5; // first, last, current, two siblings, and two dots

  if (totalPages <= totalPageNumbers) {
    for (let i = 1; i <= totalPages; i++) range.push(i);
    return range;
  }

  const leftSiblingIndex = Math.max(page - siblingCount, 1);
  const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

  const showLeftDots = leftSiblingIndex > 2;
  const showRightDots = rightSiblingIndex < totalPages - 1;

  // always include first page
  range.push(1);

  if (showLeftDots) range.push("...");

  const start = showLeftDots ? leftSiblingIndex : 2;
  const end = showRightDots ? rightSiblingIndex : totalPages - 1;

  for (let i = start; i <= end; i++) range.push(i);

  if (showRightDots) range.push("...");

  range.push(totalPages);

  return range;
}

export function usePaginatedData<T>(data: PaginatedData<T>) {
  return {
    items: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.limit,
    totalPages: data.totalPages,
  };
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, page), totalPages);
}
