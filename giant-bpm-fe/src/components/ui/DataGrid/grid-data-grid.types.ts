import { SelectOption } from "@ui/select/single-select";

export type GridHeaderItem = {
  label: string;
  keyValue: string;
  key: string;
  type: "input" | "number" | "date" | "dropdown";
  subtype?: "date" | "time" | "datetime";
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  datasource?: unknown;
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

