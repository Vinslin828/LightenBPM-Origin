import { useAtom, useAtomValue } from "jotai";
import { builderStoreAtom, formSettingAtom } from "@/store";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { SingleSelect } from "@ui/select/single-select";
import { PlusIcon, TrashIcon, CopyIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { ClipboardPaste } from "lucide-react";
import {
  getEntityTranslationKey,
  getGridColumnTranslationKey,
  getOptionTranslationKey,
} from "@/hooks/useEntityLabel";
import { EntityKey } from "@/types/form-builder";

export const SUPPORTED_LANGUAGES = [
  { key: "en", value: "en", label: "English" },
  { key: "zh-TW", value: "zh-TW", label: "繁體中文" },
  { key: "zh-CN", value: "zh-CN", label: "简体中文" },
];

const LANG_LABEL: Record<string, string> = {
  en: "English",
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
};

function getLangLabel(code: string) {
  return LANG_LABEL[code] ?? code;
}

type LabelRow = {
  key: string;
  displayName: string;
  defaultLabel: string;
  isColumnRow: boolean;
};

/** Copies text to clipboard and briefly shows a ✓ indicator on the button. */
function useCopied() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Paste-All side panel
// ---------------------------------------------------------------------------
type PasteAllPanelProps = {
  lang: string;
  rows: LabelRow[];
  currentTranslations: Record<string, string>; // rowKey → translated label
  onConfirm: (lines: string[]) => void;
  onClose: () => void;
};

function PasteAllPanel({
  lang,
  rows,
  currentTranslations,
  onConfirm,
  onClose,
}: PasteAllPanelProps) {
  const { t } = useTranslation();
  const prefill = rows.map((r) => currentTranslations[r.key] ?? "").join("\n");
  const [text, setText] = useState(prefill);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const lines = text.split("\n");
  const lineCount = lines.length;
  const countOk = lineCount === rows.length;

  const handleConfirm = () => {
    onConfirm(lines);
    onClose();
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white w-[520px] min-w-[520px] shadow-xl">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {t("form_builder.paste_all_title", {
              lang: getLangLabel(lang),
            })}
          </p>
          <p className="text-xs text-secondary-text mt-0.5">
            {t("form_builder.paste_all_hint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* Two-column body: reference | textarea */}
      <div className="flex flex-1 overflow-hidden">
        {/* Reference column */}
        <div className="flex flex-col w-[200px] min-w-[200px] border-r border-gray-100 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100 sticky top-0">
            {t("form_builder.paste_reference")}
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className={cn(
                "px-3 py-[7px] text-sm text-gray-600 border-b border-gray-50 leading-tight",
                row.isColumnRow && "pl-6 text-xs text-secondary-text",
              )}
            >
              {row.defaultLabel}
            </div>
          ))}
        </div>

        {/* Textarea column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span>{getLangLabel(lang)}</span>
            <span
              className={cn(
                "text-[10px] font-semibold tabular-nums",
                countOk ? "text-green-600" : "text-amber-500",
              )}
            >
              {lineCount} / {rows.length}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className={cn(
              "flex-1 resize-none px-3 py-2 text-sm font-mono outline-none leading-[28px]",
              "border-0 focus:ring-0",
            )}
            placeholder={rows.map((r) => r.defaultLabel).join("\n")}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
        {!countOk && (
          <p className="text-xs text-amber-600">
            ⚠{" "}
            {t("form_builder.paste_line_mismatch", {
              expected: rows.length,
              got: lineCount,
            })}
          </p>
        )}
        {countOk && <span />}
        <div className="flex gap-2 ml-auto">
          <Button variant="tertiary" size="sm" onClick={onClose}>
            {t("buttons.cancel")}
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            {t("buttons.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
type SaveOverrides = {
  translationLangs?: string[];
  labelTranslations?: Record<string, Record<string, string>>;
};

type LanguageEditorProps = {
  onSave?: (overrides?: SaveOverrides) => Promise<void>;
};

export default function LanguageEditor({ onSave }: LanguageEditorProps) {
  const { t } = useTranslation();
  const builderStore = useAtomValue(builderStoreAtom);
  const [formSetting, setFormSetting] = useAtom(formSettingAtom);
  const [addingLang, setAddingLang] = useState(false);
  const [newLangValue, setNewLangValue] = useState<string>("");
  const [pasteTarget, setPasteTarget] = useState<string | null>(null); // lang code
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const { defaultLang, translationLangs, labelTranslations } = formSetting;
  const defaultCopy = useCopied();
  const langCopies = useRef<Record<string, ReturnType<typeof useCopied>>>({});
  const latestSaveOverrides = useRef<SaveOverrides>({
    translationLangs: formSetting.translationLangs,
    labelTranslations: formSetting.labelTranslations,
  });

  useEffect(() => {
    latestSaveOverrides.current = {
      translationLangs,
      labelTranslations,
    };
  }, [translationLangs, labelTranslations]);

  // No effect-based auto-save here — instead, handleAddLanguage and
  // handleRemoveLanguage call onSave directly with the freshly-computed state
  // so the save request always carries the correct translationLangs value,
  // even before React has committed the setFormSetting batch.

  if (!builderStore) {
    return (
      <div className="flex items-center justify-center h-48 text-secondary-text text-sm">
        {t("form_builder.language_editor_empty")}
      </div>
    );
  }

  const schema = builderStore.getSchema();
  const entities = schema.entities ?? {};

  // Build rows ordered by schema root
  const rootIds: string[] = [...(schema.root ?? [])];
  const orderedIds = [
    ...rootIds,
    ...Object.keys(entities).filter((id) => !rootIds.includes(id)),
  ];

  const rows: LabelRow[] = [];
  for (const entityId of orderedIds) {
    const entity = entities[entityId];
    if (!entity) continue;

    const attrs = entity.attributes as Record<string, unknown>;
    const labelValue =
      (attrs.label as { value?: string } | undefined)?.value ?? "";
    const name = (attrs.name as string | undefined) ?? entityId;

    // For label-field entities the visible content lives in the richText attribute
    // (an HTML string). Strip tags to get the plain-text default for translation.
    let defaultLabel = labelValue.trim() ? labelValue : name;
    if (entity.type === "label") {
      const richText = (attrs.richText as string | undefined) ?? "";
      const stripped = richText.replace(/<[^>]*>/g, "").trim();
      if (stripped) defaultLabel = stripped;
    }

    const entityTranslationKey = getEntityTranslationKey(entityId, {
      name,
    });

    rows.push({
      key: entityTranslationKey,
      displayName: name,
      defaultLabel,
      isColumnRow: false,
    });

    if (entity.type === "grid" && Array.isArray(attrs.gridHeaders)) {
      const headers = attrs.gridHeaders as Array<{
        label: string;
        keyValue: string;
        key: string;
        datasource?: {
          type?: string;
          options?: Array<{ label: string; value: string; key?: string }>;
        };
      }>;
      for (const header of headers) {
        const columnTranslationKey = getGridColumnTranslationKey(
          entityTranslationKey,
          header.keyValue,
        );

        rows.push({
          key: columnTranslationKey,
          displayName: `└ ${header.keyValue}`,
          defaultLabel: header.label ?? header.keyValue,
          isColumnRow: true,
        });

        if (
          header.datasource?.type === "static" &&
          Array.isArray(header.datasource.options)
        ) {
          for (const option of header.datasource.options) {
            rows.push({
              key: getOptionTranslationKey(columnTranslationKey, option.value),
              displayName: `  └ ${option.value}`,
              defaultLabel: option.label ?? option.value,
              isColumnRow: true,
            });
          }
        }
      }
    }

    if (
      (entity.type === EntityKey.radioButton ||
        entity.type === EntityKey.checkboxField) &&
      Array.isArray(attrs.options)
    ) {
      const options = attrs.options as Array<{
        label: string;
        value: string;
        key: string;
      }>;

      for (const option of options) {
        rows.push({
          key: getOptionTranslationKey(entityTranslationKey, option.value),
          displayName: `└ ${option.value}`,
          defaultLabel: option.label ?? option.value,
          isColumnRow: true,
        });
      }
    }

    if (
      entity.type === EntityKey.selectField &&
      attrs.datasourceType &&
      typeof attrs.datasourceType === "object" &&
      (attrs.datasourceType as { type?: string }).type === "static" &&
      Array.isArray(
        (
          attrs.datasourceType as {
            options?: Array<{ label: string; value: string; key?: string }>;
          }
        ).options,
      )
    ) {
      const options = (
        attrs.datasourceType as {
          options: Array<{ label: string; value: string; key?: string }>;
        }
      ).options;

      for (const option of options) {
        rows.push({
          key: getOptionTranslationKey(entityTranslationKey, option.value),
          displayName: `└ ${option.value}`,
          defaultLabel: option.label ?? option.value,
          isColumnRow: true,
        });
      }
    }
  }

  const availableLangs = SUPPORTED_LANGUAGES.filter(
    (l) => l.value !== defaultLang && !translationLangs.includes(l.value),
  );

  // ---- Handlers ----

  const handleAddLanguage = () => {
    if (!newLangValue || translationLangs.includes(newLangValue)) {
      setAddingLang(false);
      setNewLangValue("");
      return;
    }
    // Compute the new langs synchronously so we can pass them directly to
    // onSave — the setFormSetting batch hasn't committed yet when onSave runs.
    const newLangs = [...translationLangs, newLangValue];
    latestSaveOverrides.current = {
      translationLangs: newLangs,
      labelTranslations,
    };
    setFormSetting((prev) => ({ ...prev, translationLangs: newLangs }));
    setAddingLang(false);
    setNewLangValue("");
    void onSave?.({ translationLangs: newLangs });
  };

  const handleRemoveLanguage = (lang: string) => {
    const nextTranslations: Record<string, Record<string, string>> = {};
    for (const [key, vals] of Object.entries(labelTranslations)) {
      const { [lang]: _removed, ...rest } = vals;
      if (Object.keys(rest).length > 0) nextTranslations[key] = rest;
    }
    // Compute the new values synchronously before the state batch commits.
    const newLangs = translationLangs.filter((l) => l !== lang);
    latestSaveOverrides.current = {
      translationLangs: newLangs,
      labelTranslations: nextTranslations,
    };
    setFormSetting((prev) => ({
      ...prev,
      translationLangs: newLangs,
      labelTranslations: nextTranslations,
    }));
    if (pasteTarget === lang) setPasteTarget(null);
    void onSave?.({
      translationLangs: newLangs,
      labelTranslations: nextTranslations,
    });
  };

  const handleTranslationChange = (
    rowKey: string,
    lang: string,
    value: string,
  ) => {
    setFormSetting((prev) => {
      const existing = prev.labelTranslations[rowKey] ?? {};
      const updated = value.trim()
        ? { ...existing, [lang]: value }
        : (() => {
            const { [lang]: _, ...rest } = existing;
            return rest;
          })();
      const next = { ...prev.labelTranslations };
      if (Object.keys(updated).length === 0) delete next[rowKey];
      else next[rowKey] = updated;
      latestSaveOverrides.current = {
        translationLangs: prev.translationLangs,
        labelTranslations: next,
      };
      return { ...prev, labelTranslations: next };
    });
  };

  const handlePasteConfirm = (lang: string, lines: string[]) => {
    const nextFromCurrent = { ...labelTranslations };
    rows.forEach((row, idx) => {
      const val = (lines[idx] ?? "").trim();
      const existing = nextFromCurrent[row.key] ?? {};
      if (val) {
        nextFromCurrent[row.key] = { ...existing, [lang]: val };
      } else {
        const { [lang]: _, ...rest } = existing;
        if (Object.keys(rest).length === 0) delete nextFromCurrent[row.key];
        else nextFromCurrent[row.key] = rest;
      }
    });
    latestSaveOverrides.current = {
      translationLangs,
      labelTranslations: nextFromCurrent,
    };
    setFormSetting((prev) => {
      const next = { ...prev.labelTranslations };
      rows.forEach((row, idx) => {
        const val = (lines[idx] ?? "").trim();
        const existing = next[row.key] ?? {};
        if (val) {
          next[row.key] = { ...existing, [lang]: val };
        } else {
          const { [lang]: _, ...rest } = existing;
          if (Object.keys(rest).length === 0) delete next[row.key];
          else next[row.key] = rest;
        }
      });
      return { ...prev, labelTranslations: next };
    });
  };

  const copyColumnText = (lang: string | null) => {
    if (lang === null) {
      // Default column
      return rows.map((r) => r.defaultLabel).join("\n");
    }
    // Translation column: existing translation or blank line
    return rows.map((r) => labelTranslations[r.key]?.[lang] ?? "").join("\n");
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(latestSaveOverrides.current);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch {
      setSavedOk(false);
    } finally {
      setIsSaving(false);
    }
  };

  const gridTemplateColumns = `200px 220px ${translationLangs.map(() => "220px").join(" ")} 40px`;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main table area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {t("form_builder.language_editor_default")}:
            </span>
            <span className="px-2 py-0.5 rounded bg-lighten-blue/10 text-lighten-blue text-xs font-semibold">
              {getLangLabel(defaultLang)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {addingLang ? (
              <>
                <div className="w-[180px]">
                  <SingleSelect
                    value={newLangValue}
                    options={availableLangs}
                    onChange={(v) => setNewLangValue(v ?? "")}
                    placeholder={t("form_builder.select_language")}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddLanguage}
                  disabled={!newLangValue}
                >
                  {t("buttons.confirm")}
                </Button>
                <Button
                  size="sm"
                  variant="tertiary"
                  onClick={() => {
                    setAddingLang(false);
                    setNewLangValue("");
                  }}
                >
                  {t("buttons.cancel")}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                icon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setAddingLang(true)}
                disabled={availableLangs.length === 0}
              >
                {t("form_builder.add_language")}
              </Button>
            )}
            {onSave && (
              <Button
                size="sm"
                className={cn(
                  "min-w-[80px]",
                  savedOk
                    ? "bg-green-600 hover:bg-green-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white",
                )}
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {savedOk
                  ? `✓ ${t("form_builder.saved")}`
                  : isSaving
                    ? t("buttons.saving")
                    : t("buttons.save")}
              </Button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-secondary-text text-sm py-16">
            {t("form_builder.language_editor_no_fields")}
          </div>
        ) : (
          <div className="overflow-auto flex-1 p-6">
            <div
              className="inline-grid min-w-full border border-gray-200 rounded-lg overflow-hidden"
              style={{ gridTemplateColumns }}
            >
              {/* ── Column headers ── */}
              {/* Field */}
              <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                {t("form_builder.field_name")}
              </div>

              {/* Default language column header */}
              <div className="bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 flex items-center justify-between gap-1">
                <span>
                  {getLangLabel(defaultLang)}{" "}
                  <span className="text-lighten-blue text-[10px] font-normal normal-case">
                    ({t("form_builder.default")})
                  </span>
                </span>
                <button
                  type="button"
                  title={t("form_builder.copy_column")}
                  onClick={() => defaultCopy.copy(copyColumnText(null))}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                    defaultCopy.copied
                      ? "bg-green-100 text-green-700"
                      : "text-gray-400 hover:text-lighten-blue hover:bg-lighten-blue/10",
                  )}
                >
                  <CopyIcon className="w-3.5 h-3.5" />
                  {defaultCopy.copied
                    ? t("form_builder.copied")
                    : t("form_builder.copy_all")}
                </button>
              </div>

              {/* Translation column headers */}
              {translationLangs.map((lang) => {
                // Each lang gets its own copy state via a ref — rendered via a small sub-component
                return (
                  <TranslationColHeader
                    key={lang}
                    lang={lang}
                    isActive={pasteTarget === lang}
                    copyText={copyColumnText(lang)}
                    onPasteClick={() =>
                      setPasteTarget((prev) => (prev === lang ? null : lang))
                    }
                    onRemove={() => handleRemoveLanguage(lang)}
                    removeTitle={t("form_builder.remove_language")}
                    copyTitle={t("form_builder.copy_column")}
                    copiedLabel={t("form_builder.copied")}
                    copyAllLabel={t("form_builder.copy_all")}
                    pasteAllLabel={t("form_builder.paste_all")}
                  />
                );
              })}
              {/* Spacer */}
              <div className="bg-gray-50 border-b border-gray-200" />

              {/* ── Data rows ── */}
              {rows.map((row, idx) => {
                const isLast = idx === rows.length - 1;
                const border = isLast ? "" : "border-b border-gray-100";
                return (
                  <>
                    {/* Field name */}
                    <div
                      key={`${row.key}-name`}
                      className={cn(
                        "px-4 py-2 text-sm flex items-center",
                        border,
                        row.isColumnRow
                          ? "pl-8 text-secondary-text"
                          : "font-medium text-gray-800",
                      )}
                    >
                      {row.displayName}
                    </div>

                    {/* Default label */}
                    <div
                      key={`${row.key}-default`}
                      className={cn(
                        "px-4 py-2 text-sm text-gray-600 flex items-center",
                        border,
                      )}
                    >
                      {row.defaultLabel}
                    </div>

                    {/* Translation inputs */}
                    {translationLangs.map((lang) => (
                      <div
                        key={`${row.key}-${lang}`}
                        className={cn(
                          "px-2 py-1.5 flex items-center",
                          border,
                          pasteTarget === lang && "bg-blue-50/40",
                        )}
                      >
                        <Input
                          value={labelTranslations[row.key]?.[lang] ?? ""}
                          onChange={(e) =>
                            handleTranslationChange(
                              row.key,
                              lang,
                              e.target.value,
                            )
                          }
                          placeholder={row.defaultLabel}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}

                    {/* Row spacer */}
                    <div key={`${row.key}-spacer`} className={border} />
                  </>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Paste-All side panel */}
      {pasteTarget && (
        <PasteAllPanel
          lang={pasteTarget}
          rows={rows}
          currentTranslations={Object.fromEntries(
            rows.map((r) => [
              r.key,
              labelTranslations[r.key]?.[pasteTarget] ?? "",
            ]),
          )}
          onConfirm={(lines) => handlePasteConfirm(pasteTarget, lines)}
          onClose={() => setPasteTarget(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-component so each lang column can have its own copy-state
// ---------------------------------------------------------------------------
type TranslationColHeaderProps = {
  lang: string;
  isActive: boolean;
  copyText: string;
  onPasteClick: () => void;
  onRemove: () => void;
  removeTitle: string;
  copyTitle: string;
  copiedLabel: string;
  copyAllLabel: string;
  pasteAllLabel: string;
};

function TranslationColHeader({
  lang,
  isActive,
  copyText,
  onPasteClick,
  onRemove,
  removeTitle,
  copyTitle,
  copiedLabel,
  copyAllLabel,
  pasteAllLabel,
}: TranslationColHeaderProps) {
  const { copied, copy } = useCopied();

  return (
    <div
      className={cn(
        "bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 flex items-center gap-1",
        isActive && "bg-blue-50",
      )}
    >
      <span className="flex-1 truncate">{getLangLabel(lang)}</span>

      {/* Copy current translations */}
      <button
        type="button"
        title={copyTitle}
        onClick={() => copy(copyText)}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0",
          copied
            ? "bg-green-100 text-green-700"
            : "text-gray-400 hover:text-lighten-blue hover:bg-lighten-blue/10",
        )}
      >
        <CopyIcon className="w-3.5 h-3.5" />
        {copied ? copiedLabel : copyAllLabel}
      </button>

      {/* Paste All toggle */}
      <button
        type="button"
        title={pasteAllLabel}
        onClick={onPasteClick}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0",
          isActive
            ? "bg-lighten-blue text-white"
            : "text-gray-400 hover:text-lighten-blue hover:bg-lighten-blue/10",
        )}
      >
        <ClipboardPaste className="w-3.5 h-3.5" />
        {pasteAllLabel}
      </button>

      {/* Remove language */}
      <button
        type="button"
        title={removeTitle}
        onClick={onRemove}
        className="text-gray-300 hover:text-red-500 transition-colors shrink-0 ml-0.5"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
