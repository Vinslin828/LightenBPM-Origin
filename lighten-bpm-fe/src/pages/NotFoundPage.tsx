import { Link } from "react-router-dom";
import { useAppSettings } from "../hooks/useSettings";
import { useTranslation } from "react-i18next";
import { Button } from "@ui/button";

export const NotFoundPage = () => {
  const { settings } = useAppSettings();
  const { t } = useTranslation();

  return (
    <div className={`min-h-screen flex items-center justify-center`}>
      <div className="text-center">
        <h1 className={`text-9xl font-bold`}>404</h1>
        <p className={`text-xl font-semibold mt-4`}>
          {t("errors.page_not_found")}
        </p>
        <p className={`mt-2`}>{t("errors.sorry_not_found")}</p>
        <div className="mt-8">
          <Link to="/">
            <Button>{t("buttons.go_back_home")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
