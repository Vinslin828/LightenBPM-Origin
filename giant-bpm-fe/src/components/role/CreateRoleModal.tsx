import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; name: string }) => Promise<void>;
}

export default function CreateRoleModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateRoleModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError(t("role.code_required"));
      return;
    }
    if (!name.trim()) {
      setError(t("role.name_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ code: code.trim(), name: name.trim() });
      setCode("");
      setName("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("role.create_error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCode("");
      setName("");
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
            {t("role.new_role")}
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
            <Label htmlFor="create-role-code" aria-required>
              {t("role.role_code")}
            </Label>
            <Input
              id="create-role-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("role.role_code")}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-role-name" aria-required>
              {t("role.role_name")}
            </Label>
            <Input
              id="create-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("role.role_name")}
              disabled={isSubmitting}
              required
            />
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
