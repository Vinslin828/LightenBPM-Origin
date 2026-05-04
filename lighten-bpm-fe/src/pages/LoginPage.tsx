import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import DefaultImage from "@/assets/LightenBz.png";
import DefaultLogo from "@/assets/Ltnlogo-b.svg";

const LOGIN_TITLE = import.meta.env.VITE_LOGIN_TITLE || "Welcome to Lighten BPM";
const LOGIN_SUBTITLE = import.meta.env.VITE_LOGIN_SUBTITLE || "Business Process Management";
const LOGIN_FOOTER = import.meta.env.VITE_LOGIN_FOOTER || "© 2025 Lighten Flow";
const LOGIN_IMAGE_URL = import.meta.env.VITE_LOGIN_IMAGE_URL || DefaultImage;
const LOGIN_LOGO_URL = import.meta.env.VITE_LOGIN_LOGO_URL || DefaultLogo;

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
            {LOGIN_LOGO_URL ? (
              <img src={LOGIN_LOGO_URL} alt="Logo" className="h-16 w-auto" />
            ) : (
              <Logo className="text-primary-blue" />
            )}
          </div>
          <h1 className="text-[30px] leading-[38px] font-bold text-dark">
            {t("login.welcome_title", LOGIN_TITLE)}
          </h1>
          <p className="mt-3 text-[16px] leading-[24px] text-primary-text">
            {t("login.welcome_subtitle", LOGIN_SUBTITLE)}
          </p>
          <div className="mt-10">
            <Button
              onClick={() => login()}
              className="w-full"
              disabled={isLoading}
              aria-label={t("buttons.login_with_gac", "Login with GAC")}
            >
              {isLoading ? t("loading") : t("buttons.login", "Login")}
            </Button>
          </div>

          <div className="mt-20 text-sm text-primary-text absolute bottom-20 lg:left-1/4 -translate-x-1/2 left-1/2">
            <p>{LOGIN_FOOTER}</p>
          </div>
        </div>
      </div>

      {/* Right illustration (hidden on small screens) */}
      <div className="hidden lg:block lg:w-1/2">
        <img
          src={LOGIN_IMAGE_URL}
          alt="Login illustration"
          className="object-cover h-screen w-full"
        />
      </div>
    </div>
  );
};
