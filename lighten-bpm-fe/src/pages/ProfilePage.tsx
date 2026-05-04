import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import { userAtom } from "@/store/atoms";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppSettings } from "@/hooks/useSettings";
import { useUpdateMe } from "@/hooks/useUser";
import { useUserMemberships } from "@/hooks/useUser";
import { Avatar } from "@ui/avatar";
import { GlobeIcon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const user = useAtomValue(userAtom);
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();
  const { updateSettings } = useAppSettings();
  const { mutate: updateMe, isPending } = useUpdateMe();
  const { memberships, isLoading: isMembershipsLoading } = useUserMemberships(user?.id);
  const { toast } = useToast();

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    updateSettings({ language: langCode as "en" | "zh-TW" | "zh-CN" });
    updateMe(
      { lang: langCode },
      {
        onSuccess: () =>
          toast({ title: t("profile.languageSaved", "Language preference saved") }),
        onError: () =>
          toast({ variant: "destructive", title: t("profile.languageSaveError", "Failed to save language preference") }),
      },
    );
  };

  const currentLang = supportedLanguages.find((l) => l.code === currentLanguage);

  return (
    <div className="min-h-full bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <Avatar size="lg" name={user?.name} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{user?.name ?? "—"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email ?? "—"}</p>
            {user?.isAdmin && (
              <span className="mt-2 inline-block text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          <SectionTitle>{t("profile.basicInfo", "Basic Information")}</SectionTitle>

          <InfoRow label={t("profile.name", "Name")}>{user?.name ?? "—"}</InfoRow>
          <InfoRow label={t("profile.email", "Email")}>{user?.email ?? "—"}</InfoRow>
          <InfoRow label={t("profile.employeeId", "Employee ID")}>{user?.code || "—"}</InfoRow>
          <InfoRow label={t("profile.jobGrade", "Job Grade")}>
            {user?.jobGrade ? `Grade ${user.jobGrade}` : "—"}
          </InfoRow>
        </div>

        {/* Organisation memberships */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          <SectionTitle>{t("profile.organisations", "Organisations")}</SectionTitle>

          {isMembershipsLoading ? (
            <div className="px-6 py-4 text-sm text-gray-400">{t("common.loading", "Loading…")}</div>
          ) : memberships.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-400">{t("profile.noOrgs", "No organisation memberships")}</div>
          ) : (
            memberships.map((m) => (
              <div key={m.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.orgUnitName ?? m.orgUnitCode}</p>
                  <p className="text-xs text-gray-400">{m.orgUnitCode}</p>
                </div>
                {user?.defaultOrgCode === m.orgUnitCode && (
                  <span className="text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                    {t("profile.default", "Default")}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Roles */}
        {user?.roles && user.roles.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            <SectionTitle>{t("profile.roles", "Roles")}</SectionTitle>
            {user.roles.map((role) => (
              <InfoRow key={role.id} label={role.code}>{role.name}</InfoRow>
            ))}
          </div>
        )}

        {/* Language preference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <GlobeIcon className="w-4 h-4 text-gray-500" />
              {t("profile.language", "Language")}
            </span>
          </SectionTitle>

          <div className="px-6 py-4">
            <p className="text-xs text-gray-400 mb-3">
              {t("profile.languageHint", "Choose the language for the interface and form labels.")}
            </p>
            <div className="flex flex-wrap gap-2">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  disabled={isPending}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${
                      currentLanguage === lang.code
                        ? "bg-[#3B4559] text-white border-[#3B4559]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#3B4559] hover:text-[#3B4559]"
                    }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName ?? lang.name}</span>
                </button>
              ))}
            </div>
            {currentLang && (
              <p className="mt-3 text-xs text-gray-400">
                {t("profile.currentLanguage", "Current")}: <span className="font-medium text-gray-600">{currentLang.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={() => logout()}
            className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            {t("buttons.logout", "Log out")}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── small shared sub-components ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-3 bg-gray-50 rounded-t-xl">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</h2>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-3 flex items-center justify-between">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{children}</span>
    </div>
  );
}
