import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import BikerImage from "@/assets/img_biker.png";

export const LoginPage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [user, isAuthenticated, navigate, from]);

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-24 items-center">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <Logo className="text-primary-blue" />
          </div>
          <h1 className="text-[30px] leading-[38px] font-bold text-dark">
            {t("login.welcome_title", "Welcome to Giant BPM")}
          </h1>
          <p className="mt-3 text-[16px] leading-[24px] text-primary-text">
            {t("login.welcome_subtitle", "Business Process Management")}
          </p>
          <div className="mt-10">
            <Button
              onClick={() => login()}
              className="w-full"
              disabled={isLoading}
              aria-label={t("buttons.login_with_gac", "Login with GAC")}
            >
              {isLoading
                ? t("loading")
                : t("buttons.login_with_gac", "Login with GAC")}
            </Button>
          </div>

          <div className="mt-20 text-sm text-primary-text absolute bottom-20 lg:left-1/4 -translate-x-1/2 left-1/2">
            <p>© 2025 Giant Bicycles</p>
          </div>
        </div>
      </div>

      {/* Right illustration (hidden on small scr?p;eens) */}
      <div className="hidden lg:block lg:w-1/2">
        <img
          src={BikerImage}
          alt="Cyclist"
          className="object-cover h-screen w-full"
        />
      </div>
    </div>
  );
};
