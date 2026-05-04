import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppSettings } from "@/hooks/useSettings";
import { useUpdateMe } from "@/hooks/useUser";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { BellIcon, GlobeIcon } from "@/components/icons/index";
import LimoLogo from "@/assets/LIMOLOGO.svg";
import { Avatar } from "@ui/avatar";

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  const { user } = useAuth();
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();
  const { updateSettings } = useAppSettings();
  const { mutate: updateMe } = useUpdateMe();
  const navigate = useNavigate();

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
    updateSettings({ language: languageCode as "en" | "zh-TW" | "zh-CN" });
    updateMe({ lang: languageCode });
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

      {/* Right section */}
      <div className="flex items-center space-x-3">
        <BellIcon className="text-white" />

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white p-1 rounded hover:bg-white/10 transition-colors" title={getCurrentLanguageDisplay()}>
              <GlobeIcon className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44" align="end" sideOffset={12}>
            {supportedLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={currentLanguage === lang.code ? "font-semibold bg-gray-100" : ""}
              >
                {lang.flag}&nbsp;&nbsp;{lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar → profile page */}
        <button
          className="rounded-full hover:ring-2 hover:ring-white/40 transition-all"
          onClick={() => navigate("/profile")}
          title={user?.name}
        >
          <Avatar size="sm" name={user?.name} />
        </button>
      </div>
    </header>
  );
};
