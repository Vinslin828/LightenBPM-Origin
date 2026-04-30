import { Button } from "@ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function FormNotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <div className="text-center py-12 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("errors.form_not_found")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("errors.form_not_found_description")}
        </p>
        <Link to="/forms">
          <Button>{t("buttons.back_to_forms")}</Button>
        </Link>
      </div>
    </div>
  );
}
