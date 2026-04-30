import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrgUnits } from "@/hooks/useOrganization";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    jobGrade: number;
    defaultOrgCode: string;
  }) => Promise<void>;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  const { t } = useTranslation();
  const { units } = useOrgUnits();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [jobGrade, setJobGrade] = useState<string>("1");
  const [defaultOrgCode, setDefaultOrgCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Filter to only ORG_UNIT type (not ROLE)
  const orgUnits = units.filter((u) => u.type !== "ROLE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError(t("user_management.code_required"));
      return;
    }
    if (!name.trim()) {
      setError(t("user_management.name_required"));
      return;
    }
    if (!defaultOrgCode) {
      setError(t("user_management.org_required"));
      return;
    }

    const grade = jobGrade ? Number(jobGrade) : 1;
    if (grade < 1) {
      setError(t("user_management.job_grade_min"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        jobGrade: grade,
        defaultOrgCode,
      });
      setCode("");
      setName("");
      setJobGrade("1");
      setDefaultOrgCode("");
      onClose();
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ?? err?.message ?? "";
      if (serverMsg.includes("Unique constraint") && serverMsg.includes("code")) {
        setError(t("user_management.code_duplicate"));
      } else {
        setError(serverMsg || t("user_management.create_error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCode("");
      setName("");
      setJobGrade("1");
      setDefaultOrgCode("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("user_management.new_user")}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <Label htmlFor="create-user-code" aria-required>
              {t("user_management.user_code")}
            </Label>
            <Input
              id="create-user-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("user_management.user_code_placeholder")}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-user-name" aria-required>
              {t("user_management.user_name")}
            </Label>
            <Input
              id="create-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("user_management.user_name_placeholder")}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-user-grade" aria-required>
              {t("user_management.job_grade")}
            </Label>
            <Input
              id="create-user-grade"
              type="number"
              min={1}
              value={jobGrade}
              onChange={(e) => setJobGrade(e.target.value)}
              placeholder={t("user_management.job_grade_placeholder")}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-user-org" aria-required>
              {t("user_management.default_org")}
            </Label>
            <select
              id="create-user-org"
              value={defaultOrgCode}
              onChange={(e) => setDefaultOrgCode(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full h-10 px-3 text-sm border border-stroke rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">{t("user_management.select_org")}</option>
              {orgUnits.map((org) => (
                <option key={org.id} value={org.code}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

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
