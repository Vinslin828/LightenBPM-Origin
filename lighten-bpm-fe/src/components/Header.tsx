import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppSettings } from "@/hooks/useSettings";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BellIcon } from "@/components/icons/index";
import LimoLogo from "@/assets/LIMOLOGO.svg";
import { Avatar } from "@ui/avatar";

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();
  const { updateSettings } = useAppSettings();

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
    updateSettings({ language: languageCode as "en" | "zh-TW" | "zh-CN" });
  };

  const getCurrentLanguageDisplay = () => {
    const currentLang = supportedLanguages.find(
      (lang) => lang.code === currentLanguage,
    );
    return currentLang ? `${currentLang.flag} ${currentLang.name}` : "Language";
  };

  return (
    <header className="bg-[#3B4559] shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 left-0 right-0 z-100 h-11">
      <div className="flex items-center space-x-4">
        {/* App title/breadcrumb could go here */}
        <div className="flex items-center">
          <Link to="/dashboard">
            <img src={LimoLogo} alt="Logo" className="h-16 w-auto brightness-0 invert" />
          </Link>
        </div>
      </div>

      {/* Right section - language switcher */}
      <div className="flex items-center space-x-4">
        <BellIcon className="text-white" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full">
              <Avatar size="sm" name={user?.name} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" sideOffset={12}>
            <DropdownMenuLabel>
              <div className="font-semibold">{user?.name}</div>
              <div className="text-xs text-gray-500 font-normal">
                {user?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              {t("buttons.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
