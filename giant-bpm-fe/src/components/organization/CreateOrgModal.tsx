import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Unit } from "@/types/domain";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    parentCode?: string;
  }) => Promise<void>;
  allUnits: Unit[];
  initialParentCode?: string;
}

/**
 * Modal for creating a new organization unit
 */
export default function CreateOrgModal({
  isOpen,
  onClose,
  onSubmit,
  allUnits,
  initialParentCode,
}: CreateOrgModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Set initial parent code when modal opens with a parent pre-selected
  useEffect(() => {
    if (isOpen && initialParentCode) {
      setParentCode(initialParentCode);
    }
  }, [isOpen, initialParentCode]);

  // Filter to only show ORG_UNIT type (not ROLE)
  const orgUnits = useMemo(
    () => allUnits.filter((u) => u.type === "ORG_UNIT" || !u.type),
    [allUnits],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!code.trim()) {
      setError(t("organization.code_required"));
      return;
    }
    if (!name.trim()) {
      setError(t("organization.name_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        parentCode: parentCode || undefined,
      });
      // Reset form
      setCode("");
      setName("");
      setParentCode("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("organization.create_error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCode("");
      setName("");
      setParentCode("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("organization.create_org")}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Organization Code */}
          <div>
            <Label htmlFor="create-org-code" aria-required>
              {t("organization.org_code")}
            </Label>
            <Input
              id="create-org-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("organization.org_code_placeholder")}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("organization.code_help")}
            </p>
          </div>

          {/* Organization Name */}
          <div>
            <Label htmlFor="create-org-name" aria-required>
              {t("organization.org_name")}
            </Label>
            <Input
              id="create-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("organization.org_name_placeholder")}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Parent Organization (Optional) */}
          <div>
            <Label htmlFor="create-org-parent">
              {t("organization.parent_org")}
            </Label>
            <select
              id="create-org-parent"
              value={parentCode}
              onChange={(e) => setParentCode(e.target.value)}
              disabled={isSubmitting}
              className="flex h-12 w-full rounded-[6px] border border-stroke bg-white px-5 py-3 text-base font-normal text-dark focus:border-[1.5px] focus:border-giant-blue focus:outline-none disabled:bg-gray-2 disabled:text-primary-text disabled:border-gray-2"
            >
              <option value="">{t("organization.no_parent")}</option>
              {orgUnits.map((unit) => (
                <option key={unit.id} value={unit.code}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t("organization.parent_help")}
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("buttons.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("buttons.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
