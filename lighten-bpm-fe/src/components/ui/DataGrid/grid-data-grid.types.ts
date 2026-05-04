import { SelectOption } from "@ui/select/single-select";

export type GridHeaderItem = {
  label: string;
  keyValue: string;
  key: string;
  type: "input" | "number" | "date" | "dropdown" | "expression";
  subtype?: "date" | "time" | "datetime";
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  datasource?: unknown;
  expression?: string;
};

export type DropdownStaticDatasource = {
  type: "static";
  options: SelectOption[];
  defaultValue?: {
    isReference: boolean;
    value?: string | string[];
    reference?: string;
  };
};

export type DropdownDynamicDatasource = {
  type: "dynamic";
  table?: {
    tableKey: string | null;
    labelKey: string | null;
    valueKey: string | null;
  };
  sorter?: {
    columnKey?: string;
    order?: "asc" | "desc";
  };
};

