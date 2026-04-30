"use client";

import * as React from "react";
import {
  SingleSelect,
  type SelectOption,
  type SingleSelectProps,
} from "./single-select";
import { MultiSelect, type MultiSelectProps } from "./multi-select";
import { SearchableSelect } from "./searchable-select";

type SingleModeProps<T extends string | number = string> =
  SingleSelectProps<T> & {
    mode?: "single";
    multiple?: false;
  };

type MultiModeProps<T extends string | number = string> =
  MultiSelectProps<T> & {
    mode?: "multiple";
    multiple?: true;
  };

export type SelectProps<T extends string | number = string> =
  | SingleModeProps<T>
  | MultiModeProps<T>;

function isMultiMode<T extends string | number>(
  props: SelectProps<T>,
): props is MultiModeProps<T> {
  return props.mode === "multiple" || props.multiple === true;
}

function SelectInner<T extends string | number = string>(
  props: SelectProps<T>,
  ref: React.ForwardedRef<HTMLSelectElement | HTMLDivElement>,
) {
  if (isMultiMode(props)) {
    const { mode: _mode, multiple: _multiple, ...rest } = props;
    return <MultiSelect ref={ref as React.Ref<HTMLDivElement>} {...rest} />;
  }

  const { mode: _mode, multiple: _multiple, ...rest } = props;
  return <SingleSelect ref={ref as React.Ref<HTMLSelectElement>} {...rest} />;
}

type SelectComponent = <T extends string | number = string>(
  props: SelectProps<T> & {
    ref?: React.ForwardedRef<HTMLSelectElement | HTMLDivElement>;
  },
) => React.JSX.Element;

export const Select = React.forwardRef(SelectInner) as SelectComponent & {
  displayName?: string;
};
Select.displayName = "Select";

export { SingleSelect, MultiSelect, SearchableSelect };
export type { SelectOption, SingleSelectProps, MultiSelectProps };
