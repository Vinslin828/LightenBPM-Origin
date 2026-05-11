// Form Builder Configuration
// Component mappings, palette definitions, and default values

import { TextFieldEntity } from "../components/form/entities/text-field/component";
import { TextareaFieldEntity } from "../components/form/entities/textarea-field/component";
import { NumberFieldEntity } from "../components/form/entities/number-field/component";
import { SelectFieldEntity } from "../components/form/entities/select-field/component";
import { DatePickerFieldEntity } from "../components/form/entities/date-picker/component";
import { CheckboxFieldEntity } from "../components/form/entities/check-box/component";
import { RadioButtonEntity } from "../components/form/entities/radio-button/component";
import { ToggleFieldEntity } from "../components/form/entities/toggle-field/component";
import { FileUploadFieldEntity } from "../components/form/entities/file-upload-field/component";
import { FileDownloadFieldEntity } from "../components/form/entities/file-download-field/component";
import { SeparatorFieldEntity } from "../components/form/entities/separator-field/component";
import { CurrencyFieldEntity } from "../components/form/entities/currency/component";
import { ButtonUrlEntity } from "../components/form/entities/button-url/component";
import { TextFieldAttributes } from "../components/form/entities/text-field/attributes-component";
import { TextareaFieldAttributes } from "../components/form/entities/textarea-field/attributes-component";
import { NumberFieldAttributes } from "../components/form/entities/number-field/attributes-component";
import { SelectFieldAttributes } from "../components/form/entities/select-field/attributes-component";
import { DatePickerFieldAttributes } from "../components/form/entities/date-picker/attributes-component";
import { CheckboxFieldAttributes } from "../components/form/entities/check-box/attributes-component";
import { RadioButtonAttributes } from "../components/form/entities/radio-button/attributes-component";
import { ToggleFieldAttributes } from "../components/form/entities/toggle-field/attributes-component";
import { FileUploadFieldAttributes } from "../components/form/entities/file-upload-field/attributes-component";
import { FileDownloadFieldAttributes } from "../components/form/entities/file-download-field/attributes-component";
import { SeparatorFieldAttributes } from "../components/form/entities/separator-field/attributes-component";
import { CurrencyFieldAttributes } from "../components/form/entities/currency/attributes-component";
import { GridAttributes } from "@/components/form/entities/grid/attributes-component";
import { ButtonUrlAttributes } from "../components/form/entities/button-url/attributes-component";
import { ButtonApiEntity } from "../components/form/entities/button-api/component";
import { ButtonApiAttributes } from "../components/form/entities/button-api/attributes-component";
import { ContainerEntity } from "../components/form/entities/container/component";
import { ContainerAttributes } from "../components/form/entities/container/attributes-component";
import { ExpressionFieldEntity } from "../components/form/entities/expression/component";
import { ExpressionFieldAttributes } from "../components/form/entities/expression/attributes-component";
import { LabelFieldEntity } from "../components/form/entities/label-field/component";
import { LabelFieldAttributes } from "../components/form/entities/label-field/attributes-component";

import {
  ButtonIcon,
  CheckboxIcon,
  DateTimeIcon,
  DropdownIcon,
  FileUploadIcon,
  FileDownloadIcon,
  GridIcon,
  InputIcon,
  ManualIcon,
  RadioIcon,
  TextareaIcon,
  ToggleIcon,
  SeparatorIcon,
  NumberIcon,
  CurrencyIcon,
  UrlIcon,
  ContainerIcon,
  CodeIcon,
  ExpressionIcon,
} from "@/components/icons";
import { EntityKey, PaleteGroup, PaletteItem } from "@/types/form-builder";
import type { EntitiesComponents } from "@coltorapps/builder-react";
import { basicFormBuilder } from "@/components/form/builder/definition";

import { customAlphabet } from "nanoid";
import { GridEntity } from "@/components/form/entities/grid/component";
import { FormDefinition } from "@/types/domain";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const generateFieldName = (field: string) => `${field}_${nanoid()}`;

export const getEntityLabelKey = (entityKey: EntityKey | null) => {
  switch (entityKey) {
    case EntityKey.textField:
      return "text_field";
    case EntityKey.textareaField:
      return "textarea_field";
    case EntityKey.numberField:
      return "number_field";
    case EntityKey.selectField:
      return "select_field";
    case EntityKey.datePickerField:
      return "date_picker_field";
    case EntityKey.grid:
      return "grid";
    case EntityKey.checkboxField:
      return "checkbox_field";
    case EntityKey.radioButton:
      return "radio_button";
    case EntityKey.toggleField:
      return "toggle_field";
    case EntityKey.buttonUpload:
      return "file_upload_field";
    case EntityKey.buttonDownload:
      return "file_download_field";
    case EntityKey.buttonUrl:
      return "button_url";
    case EntityKey.buttonApi:
      return "button_api";
    case EntityKey.container:
      return "container_field";
    case EntityKey.expressionField:
      return "expression_field";
    case EntityKey.separatorField:
      return "separator_field";
    case EntityKey.currencyField:
      return "currency_field";
    case EntityKey.labelField:
      return "label_field";
    default:
      return "form";
  }
};

/**
 * Rules for formBuilderConfig:
 * [ @param FORM_BUILDER_ENTITY_KEY ]: {
 *   @param entity: React Component for rendering the entity in the canvas
 *   @param attribute: React Component for rendering the attribute panel
 *   @param palette: { icon: Icon component for the palette, group: PALETTE_GROUP }
 *   @param defaultAttributes: Default attributes for the entity
 * }
 */
export const formBuilderConfig = {
  [EntityKey.labelField]: {
    entity: LabelFieldEntity,
    attribute: LabelFieldAttributes,
    palette: {
      icon: InputIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      width: 12,
      name: generateFieldName("label"),
      label: { value: "Label" },
      richText: "<p>Label text</p>",
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.textField]: {
    entity: TextFieldEntity,
    attribute: TextFieldAttributes,
    palette: {
      icon: ManualIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      width: 12,
      name: generateFieldName("text_field"),
      label: { value: "Text Field" },
      inputType: "text",
      placeholder: "Enter text",
      defaultValue: { isReference: false, value: undefined },
      validator: {
        required: false,
      },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.textareaField]: {
    entity: TextareaFieldEntity,
    attribute: TextareaFieldAttributes,
    palette: {
      icon: TextareaIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      name: generateFieldName("textarea_field"),
      width: 12,
      label: { value: "Textarea Field" },
      placeholder: "Type here...",
      defaultValue: { isReference: false, value: undefined },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.numberField]: {
    entity: NumberFieldEntity,
    attribute: NumberFieldAttributes,
    palette: {
      icon: NumberIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      width: 12,
      label: { value: "Number Field" },
      name: generateFieldName("number_field"),
      // placeholder: 'Enter number',
      defaultValue: { isReference: false, value: undefined },
      min: undefined,
      max: undefined,
      step: undefined,
      // expression: "",
      decimalDigits: 0,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.expressionField]: {
    entity: ExpressionFieldEntity,
    attribute: ExpressionFieldAttributes,
    palette: {
      icon: ExpressionIcon,
      group: PaleteGroup.Others,
    },
    defaultAttributes: {
      width: 12,
      name: generateFieldName("expression"),
      label: { value: "Expression" },
      expression: undefined,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },

  [EntityKey.selectField]: {
    entity: SelectFieldEntity,
    attribute: SelectFieldAttributes,
    palette: {
      icon: DropdownIcon,
      group: PaleteGroup.Selection,
    },
    defaultAttributes: {
      width: 12,
      label: { value: "Dropdown Field" },
      name: generateFieldName("select_field"),
      placeholder: "Select an option",
      datasourceType: {
        type: "static",
        options: [{ label: "Option 1", value: "option1", key: "option_1" }],
      },
      selectAdvancedSetting: {
        multipleSelection: false,
        searchInOptions: false,
      },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.datePickerField]: {
    entity: DatePickerFieldEntity,
    attribute: DatePickerFieldAttributes,
    palette: {
      icon: DateTimeIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      width: 12,
      name: generateFieldName("date_picker_field"),
      label: { value: "Date Picker Field" },
      flowType: undefined,
      dateSubtype: "date",
      defaultValue: { isReference: false, value: undefined },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  // paragraph: {
  //   entity: ParagraphEntity,
  //   attribute: ParagraphAttributes,
  //   defaultAttributes: {
  //     width: 12,
  //     content: {
  //       text: 'This is a paragraph.',
  //     },
  //   },
  // },

  [EntityKey.grid]: {
    entity: GridEntity,
    attribute: GridAttributes,
    palette: {
      icon: GridIcon,
      group: PaleteGroup.Others,
    },
    defaultAttributes: {
      name: generateFieldName("grid"),
      width: 12,
      label: { value: "Grid" },
      rowConfig: { minRows: undefined, maxRows: undefined },
      gridHeaders: [
        {
          label: "Column 1",
          key: "column_1",
          keyValue: "column_1",
          type: "input",
          placeholder: "",
          defaultValue: "",
          required: false,
        },
      ],
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.checkboxField]: {
    entity: CheckboxFieldEntity,
    attribute: CheckboxFieldAttributes,
    palette: {
      icon: CheckboxIcon,
      group: PaleteGroup.Selection,
    },
    defaultAttributes: {
      width: 12,
      name: generateFieldName("checkbox_field"),
      label: { value: "Checkbox" },
      defaultValue: { isReference: false, value: null },
      options: [
        { label: "Option 1", value: "option_1", key: "option_1" },
        { label: "Option 2", value: "option_2", key: "option_2" },
      ],
      flowType: undefined,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.radioButton]: {
    entity: RadioButtonEntity,
    attribute: RadioButtonAttributes,
    palette: {
      icon: RadioIcon,
      group: PaleteGroup.Selection,
    },
    defaultAttributes: {
      name: generateFieldName("radio_button"),
      width: 12,
      label: { value: "Radio Button Field" },
      defaultValue: undefined,
      options: [
        { label: "Option 1", value: "option1", key: "option_1" },
        { label: "Option 2", value: "option2", key: "option_2" },
      ],
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.toggleField]: {
    entity: ToggleFieldEntity,
    attribute: ToggleFieldAttributes,
    palette: {
      icon: ToggleIcon,
      group: PaleteGroup.Selection,
    },
    defaultAttributes: {
      name: generateFieldName("toggle_field"),
      width: 12,
      label: { value: "Toggle Field" },
      defaultValue: { isReference: false, value: false },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.separatorField]: {
    entity: SeparatorFieldEntity,
    attribute: SeparatorFieldAttributes,
    palette: {
      icon: SeparatorIcon,
      group: PaleteGroup.Others,
    },
    defaultAttributes: {
      name: generateFieldName("separator"),
      width: 12,
      label: { value: "Separator" },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.currencyField]: {
    entity: CurrencyFieldEntity,
    attribute: CurrencyFieldAttributes,
    palette: {
      icon: CurrencyIcon,
      group: PaleteGroup.Input,
    },
    defaultAttributes: {
      name: generateFieldName("currency"),
      width: 12,
      label: { value: "Currency" },
      currencyList: "default-list",
      currencyCode: { isReference: false, value: "USD" },
      allowCurrencyChange: true,
      decimalDigits: 0,
      defaultValue: { isReference: false, value: undefined },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.buttonUpload]: {
    entity: FileUploadFieldEntity,
    attribute: FileUploadFieldAttributes,
    palette: {
      icon: FileUploadIcon,
      group: PaleteGroup.ActionButton,
    },
    defaultAttributes: {
      name: generateFieldName("button_upload"),
      width: 12,
      label: { value: "File Upload Field" },
      buttonText: "Browse",
      fileSize: 15,
      supportedFormats: ["PDF"],
      enableMultiple: false,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,  
    },
  },
  [EntityKey.buttonDownload]: {
    entity: FileDownloadFieldEntity,
    attribute: FileDownloadFieldAttributes,
    palette: {
      icon: FileDownloadIcon,
      group: PaleteGroup.ActionButton,
    },
    defaultAttributes: {
      name: generateFieldName("button_download"),
      width: 12,
      label: { value: "File download" },
      buttonText: "Download",
      targetFileUrl: undefined,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.buttonUrl]: {
    entity: ButtonUrlEntity,
    attribute: ButtonUrlAttributes,
    palette: {
      icon: UrlIcon,
      group: PaleteGroup.ActionButton,
    },
    defaultAttributes: {
      name: generateFieldName("button_url"),
      width: 12,
      label: { value: "URL" },
      buttonText: "Open",
      targetUrl: undefined,
      openNewTab: true,
      isButton: false,
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.buttonApi]: {
    entity: ButtonApiEntity,
    attribute: ButtonApiAttributes,
    palette: {
      icon: CodeIcon,
      group: PaleteGroup.ActionButton,
    },
    defaultAttributes: {
      name: generateFieldName("button_api"),
      width: 12,
      label: { value: "External API" },
      buttonText: "Fetch Data",
      hideResponseData: false,
      apiCode: {
        returnType: "text",
        code: "function getData(){\n  return 'plain text result';\n}",
      },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },
  [EntityKey.container]: {
    entity: ContainerEntity,
    attribute: ContainerAttributes,
    palette: {
      icon: ContainerIcon,
      group: PaleteGroup.Others,
    },
    defaultAttributes: {
      width: 12,
      containerColumns: 2,
      name: generateFieldName("container"),
      label: { value: "Container" },
      // visibility
      hide: false,
      readonly: false,
      disabled: false,
      required: false,
    },
  },

};

type FormBuilderConfigKey = keyof typeof formBuilderConfig;

export const entitiesComponents = Object.fromEntries(
  Object.entries(formBuilderConfig).map(([key, config]) => [
    key,
    config.entity,
  ]),
) as EntitiesComponents<typeof basicFormBuilder>;

export const attributesPanelComponents = Object.fromEntries(
  Object.entries(formBuilderConfig).map(([key, config]) => [
    key,
    config.attribute,
  ]),
) as {
  [K in keyof typeof formBuilderConfig]: (typeof formBuilderConfig)[K]["attribute"];
};

export const groupConfigs = {
  [PaleteGroup.Input]: {
    name: "Input",
    color: "bg-yellow-400",
  },
  [PaleteGroup.Selection]: {
    name: "Selection",
    color: "bg-green-400",
  },
  [PaleteGroup.ActionButton]: {
    name: "Action buttons",
    color: "bg-violet-400",
  },
  [PaleteGroup.Others]: {
    name: "Others",
    color: "bg-dark-6",
  },
};

export const paletteTileComponents: Record<string, PaletteItem> =
  Object.fromEntries(
    Object.entries(formBuilderConfig)
      .filter(([, config]) => !!config.palette)
      .map(([key, config]) => [key, { key, ...config.palette }]),
  );

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export function getDefaultAttributes<T extends FormBuilderConfigKey>(
  componentType: T,
): (typeof formBuilderConfig)[T]["defaultAttributes"] {
  const baseAttributes = formBuilderConfig[componentType].defaultAttributes;
  const clonedAttributes = deepClone(baseAttributes);
  if (
    clonedAttributes &&
    typeof clonedAttributes === "object" &&
    "name" in clonedAttributes &&
    typeof clonedAttributes.name === "string"
  ) {
    const currentName = clonedAttributes.name;
    const prefix =
      currentName.split("_")[0] || getEntityLabelKey(componentType);
    clonedAttributes.name = generateFieldName(prefix);
  }

  return clonedAttributes;
}

export const tabItems = [
  { key: "form-builder", label: "Form Builder", labelKey: "form_builder" },
  {
    key: "language-editor",
    label: "Language Editor",
    labelKey: "language_editor",
  },
  { key: "preview", label: "Preview", labelKey: "preview" },
  {
    key: "schema-generation",
    label: "Schema Generation",
    labelKey: "schema_generation",
  },
];

const hasValidLabelObject = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const label = value as { isReference?: unknown; value?: unknown };
  if (label.isReference === true) {
    return true;
  }

  return typeof label.value === "string" && label.value.trim().length > 0;
};

// 這個主要是用來在form schema 變更以後，用來向下兼容舊版本沒有的 attribute
export const hydrateSchemaWithRequiredDefaults = (
  schema: FormDefinition["schema"],
): FormDefinition["schema"] => {
  const entities = schema?.entities ?? {};
  let changed = false;
  const nextEntities: Record<
    string,
    FormDefinition["schema"]["entities"][string]
  > = {
    ...entities,
  };

  Object.entries(entities).forEach(([entityId, entity]) => {
    const entityType = entity.type as EntityKey;
    if (!(entityType in formBuilderConfig)) {
      return;
    }
    const configEntityType = entityType as FormBuilderConfigKey;
    const defaults = getDefaultAttributes(configEntityType) as Record<
      string,
      unknown
    >;
    const currentAttrs =
      (entity.attributes as Record<string, unknown> | undefined) ?? {};
    const nextAttrs: Record<string, unknown> = { ...currentAttrs };
    let attrsChanged = false;

    if (
      typeof defaults.name === "string" &&
      (typeof currentAttrs.name !== "string" || !currentAttrs.name.trim())
    ) {
      nextAttrs.name = defaults.name;
      attrsChanged = true;
    }

    if (
      defaults.label !== undefined &&
      !hasValidLabelObject(currentAttrs.label)
    ) {
      nextAttrs.label = deepClone(defaults.label);
      attrsChanged = true;
    }

    if (attrsChanged) {
      nextEntities[entityId] = {
        ...entity,
        attributes: nextAttrs,
      } as FormDefinition["schema"]["entities"][string];
      changed = true;
    }
  });

  if (!changed) {
    return schema;
  }

  return {
    ...schema,
    entities: nextEntities,
  };
};
