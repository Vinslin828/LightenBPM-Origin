import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { useValidators } from "@/hooks/useValidator";
import { cn } from "@/utils/cn";
import { Search } from "lucide-react";
import { Validator } from "@/types/validator";

interface ValidatorListPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export default function ValidatorListPanel({
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  page,
  onPageChange,
}: ValidatorListPanelProps) {
  const { t } = useTranslation();
  const { validators, total, isLoading } = useValidators({
    page,
    limit: 15,
    name: searchQuery || undefined,
  });

  const totalPages = total ? Math.ceil(total / 15) : 0;

  return (
    <div className="flex h-full w-[420px] flex-col border-r border-stroke bg-white">
      {/* Search */}
      <div className="p-4">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("validation_registry.search_placeholder")}
          icon={<Search className="h-4 w-4" />}
          hasClearIcon
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-secondary-text">
            {t("loading")}
          </div>
        )}
        {!isLoading && (!validators || validators.length === 0) && (
          <div className="flex items-center justify-center py-12 text-secondary-text">
            {t("validation_registry.no_validations")}
          </div>
        )}
        {validators?.map((validator: Validator) => (
          <button
            key={validator.id}
            type="button"
            onClick={() => onSelect(validator.id)}
            className={cn(
              "w-full border-l-4 px-4 py-3 text-left transition-colors hover:bg-gray-50",
              selectedId === validator.id
                ? "border-l-giant-blue bg-blue-50"
                : "border-l-transparent",
            )}
          >
            <div className="text-sm font-medium text-dark">
              {validator.name}
            </div>
            {validator.description && (
              <div className="mt-0.5 truncate text-xs text-secondary-text">
                {validator.description}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-stroke">
          <Pagination
            totalPages={totalPages}
            page={page}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
