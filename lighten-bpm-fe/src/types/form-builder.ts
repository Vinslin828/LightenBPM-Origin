// Form Builder Types and Configurations
// Centralized type definitions for the form builder system

import { gridEntity } from "@/components/form/entities/grid/definition";
import { numberFieldEntity } from "@/components/form/entities/number-field/definition";
import { selectFieldEntity } from "@/components/form/entities/select-field/definition";
import { textFieldEntity } from "@/components/form/entities/text-field/definition";
import { textareaFieldEntity } from "@/components/form/entities/textarea-field/definition";
import { JSX } from "react";

// Common width type used across all form fields
export type FieldWidth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Palette groupings for form field categorization
export enum PaleteGroup {
  Input = "input",
  Selection = "selection",
  ActionButton = "action_button",
  Others = "others",
}

export enum EntityKey {
  textField = "input",
  textareaField = "textarea",
  numberField = "number",
  expressionField = "expression",
  selectField = "dropdown",
  datePickerField = "date",
  // paragraph = 'paragraph',
  grid = "grid",
  checkboxField = "checkbox",
  radioButton = "radio",
  toggleField = "toggle",
  buttonUpload = "button_upload",
  buttonDownload = "button_download",
  buttonUrl = "button_url",
  separatorField = "separator",
  currencyField = "currency",
  buttonApi = "button_api",
  container = "container",
  buttonUrlField = "button_url_field",
  labelField = "label",
}

export enum FormStatus {
  Draft = "draft",
  Published = "published",
  Archived = "archived",
}

// Individual field default attribute types
export type TextFieldDefaults = (typeof textFieldEntity)["attributes"];

export type TextareaFieldDefaults = (typeof textareaFieldEntity)["attributes"];

export type NumberFieldDefaults = (typeof numberFieldEntity)["attributes"];

export type SelectFieldDefaults = (typeof selectFieldEntity)["attributes"];

export type CheckboxFieldDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  defaultValue: string[];
  options: string[];
  flowType: string;
  required: boolean;
};

export type RadioButtonDefaults = {
  width: FieldWidth;
  label: string;
  defaultValue: string;
  required: boolean;
  options: string[];
};

export type ToggleFieldDefaults = {
  width: FieldWidth;
  label: string;
  defaultValue: boolean;
  required: boolean;
};

export type CurrencyCode =
  | "AUD"
  | "CAD"
  | "CHF"
  | "CNY"
  | "EUR"
  | "GBP"
  | "HKD"
  | "HUF"
  | "JPY"
  | "KRW"
  | "MXN"
  | "PLN"
  | "THB"
  | "TWD"
  | "USD"
  | "VND";
export type CurrencyCodeValue =
  | { isReference: true; reference?: string }
  | { isReference?: false; value?: CurrencyCode };

export type CurrencyFieldDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  currencyList: string;
  currencyCode: CurrencyCodeValue;
  allowCurrencyChange: boolean;
  decimalDigits?: number;
  defaultValue?: number;
  required: boolean;
  readonly: boolean;
};

export type CurrencyValueFieldDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  currencyCode: CurrencyCode;
  decimalDigits?: number;
  readonly: boolean;
};

export type ButtonFieldDefaults = {
  width: FieldWidth;
  label: string;
  readonly: boolean;
};

export type SeparatorFieldDefaults = {
  width: FieldWidth;
  label: string;
  name: string;
  readonly: boolean;
};

export type FileUploadFieldDefaults = {
  width: FieldWidth;
  label: string;
  required: boolean;
  readonly: boolean;
};

export type DatePickerFieldDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  flowType?: string;
  dateSubtype: "date" | "time" | "datetime";
  defaultValue?: number;
};

export type DemoGridDefaults = {
  width: FieldWidth;
  label: string;
  demoColumns: string[];
  readonly: boolean;
};

export type GridDefaults = (typeof gridEntity)["attributes"];

export type ParagraphDefaults = {
  width: FieldWidth;
  content: {
    text: string;
    bold?: boolean;
    italic?: boolean;
  };
};

export type ButtonApiDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  buttonText: string;
  hideResponseData: boolean;
  apiCode: {
    returnType: "text" | "grid" | "richText";
    code: string;
  };
  required: boolean;
};

export type ContainerDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  containerColumns: number;
};

export type ExpressionFieldDefaults = {
  width: FieldWidth;
  name: string;
  label: string;
  expression?: string;
};

// Union type for all field defaults
export type DefaultAttributes = {
  textField: TextFieldDefaults;
  textareaField: TextareaFieldDefaults;
  numberField: NumberFieldDefaults;
  selectField: SelectFieldDefaults;
  checkboxField: CheckboxFieldDefaults;
  radioButton: RadioButtonDefaults;
  toggleField: ToggleFieldDefaults;
  currencyField: CurrencyFieldDefaults;
  buttonField: ButtonFieldDefaults;
  separatorField: SeparatorFieldDefaults;
  buttonUpload: FileUploadFieldDefaults;
  datePickerField: DatePickerFieldDefaults;
  demoGrid: DemoGridDefaults;
  grid: GridDefaults;
  paragraph: ParagraphDefaults;
  currencyValueField: CurrencyValueFieldDefaults;
  buttonApi: ButtonApiDefaults;
  container: ContainerDefaults;
  expressionField: ExpressionFieldDefaults;
  [key: string]:
    | { label: string }
    | TextFieldDefaults
    | TextareaFieldDefaults
    | NumberFieldDefaults
    | SelectFieldDefaults
    | CheckboxFieldDefaults
    | RadioButtonDefaults
    | ToggleFieldDefaults
    | ButtonFieldDefaults
    | FileUploadFieldDefaults
    | DatePickerFieldDefaults
    | DemoGridDefaults
    | GridDefaults
    | ParagraphDefaults
    | ButtonApiDefaults
    | ContainerDefaults;
};

// Palette item configuration type
export type PaletteItem = {
  key: string;
  icon: ({ className }: { className?: string }) => JSX.Element;
  group: PaleteGroup;
};

export type FormSetting = {
  validation: {
    required: boolean;
    validators: {
      key: string;
      listenFieldIds: string[];
      code?: string;
      description?: string;
      errorMessage?: string;
      isApi?: boolean;
    }[];
  };
};
