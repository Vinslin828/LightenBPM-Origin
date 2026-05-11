import type { Unit } from "@/types/domain";

export function getLocalizedOrgUnitName(
  unit: Pick<Unit, "name" | "nameTranslations">,
  language?: string,
): string {
  const translations = unit.nameTranslations ?? {};
  const normalizedLanguage = language?.trim();
  const translatedName = normalizedLanguage
    ? translations[normalizedLanguage]?.trim()
    : undefined;

  return translatedName || unit.name;
}

export function localizeOrgUnit(unit: Unit, language?: string): Unit {
  const defaultName = unit.defaultName ?? unit.name;
  return {
    ...unit,
    defaultName,
    name: getLocalizedOrgUnitName(unit, language),
    parent: unit.parent ? localizeOrgUnit(unit.parent, language) : undefined,
    children: unit.children?.map((child) =>
      typeof child === "string" ? child : localizeOrgUnit(child, language),
    ),
  };
}

export function localizeOrgUnits(units: Unit[], language?: string): Unit[] {
  return units.map((unit) => localizeOrgUnit(unit, language));
}
