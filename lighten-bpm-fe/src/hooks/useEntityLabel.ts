import { useAtomValue } from "jotai";
import { formSettingAtom } from "@/store";
import { useTranslation } from "react-i18next";

/**
 * Resolves a translated label for a form entity (or grid column).
 *
 * Fallback chain:
 *  1. labelTranslations[entityKey][currentLang]
 *  2. labelTranslations[entityKey][defaultLang]
 *  3. fallback (the stored label value / entity name)
 */
export function resolveEntityLabel(
  entityKey: string,
  fallback: string,
  labelTranslations: Record<string, Record<string, string>>,
  defaultLang: string,
  currentLang: string,
  aliases: string[] = [],
): string {
  const keys = Array.from(
    new Set([entityKey, ...aliases].filter((key) => key.trim().length > 0)),
  );

  for (const key of keys) {
    const translations = labelTranslations[key];
    if (!translations) continue;
    if (translations[currentLang]) return translations[currentLang];
    if (translations[defaultLang]) return translations[defaultLang];
  }

  return fallback;
}

export function getEntityTranslationKey(
  entityId: string,
  attributes?: { name?: string },
): string {
  const name = attributes?.name?.trim();
  return name || entityId;
}

export function getGridColumnTranslationKey(
  entityKey: string,
  columnKey: string,
): string {
  return `${entityKey}_col_${columnKey}`;
}

export function getOptionTranslationKey(
  entityKey: string,
  optionValue: string,
): string {
  return `${entityKey}_option_${optionValue}`;
}

/**
 * React hook that resolves a translated label for a form entity.
 *
 * @param entityKey  The entity id, or `${entityId}_col_${keyValue}` for grid columns.
 * @param fallback   The default label string (used when no translation is found).
 */
export function useEntityLabel(
  entityKey: string,
  fallback: string,
  aliases: string | string[] = [],
): string {
  const { i18n } = useTranslation();
  const { defaultLang, labelTranslations } = useAtomValue(formSettingAtom);
  return resolveEntityLabel(
    entityKey,
    fallback,
    labelTranslations,
    defaultLang,
    i18n.language,
    Array.isArray(aliases) ? aliases : [aliases],
  );
}
