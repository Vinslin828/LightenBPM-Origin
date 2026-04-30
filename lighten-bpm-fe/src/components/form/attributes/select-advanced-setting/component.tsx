import { Checkbox } from "@/components/ui/checkbox";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";

import {
  selectAdvancedSettingAttribute,
  SELECT_ADVANCED_SETTING_EVENT,
  getSelectAdvancedSettingEventName,
  type SelectAdvancedSettingDetail,
} from "./definition";

export const SelectAdvancedSettingAttribute = createAttributeComponent(
  selectAdvancedSettingAttribute,
  function SelectAdvancedSettingAttribute(props) {
    const currentValue = props.attribute.value ?? {
      multipleSelection: false,
      searchInOptions: false,
    };

    const error = formatError(props.attribute.value, props.attribute.error);

    const handleMultipleSelectionChange = (nextValue: boolean) => {
      props.setValue({
        ...currentValue,
        multipleSelection: nextValue,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<SelectAdvancedSettingDetail>(
            getSelectAdvancedSettingEventName(props.entity?.id),
            {
              detail: {
                entityId: props.entity?.id,
                multipleSelection: nextValue,
              },
            },
          ),
        );
      }
    };

    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${props.attribute.name}-multiple-selection`}
              checked={currentValue.multipleSelection}
              onCheckedChange={(checked) =>
                handleMultipleSelectionChange(checked === true)
              }
            />
            <label
              htmlFor={`${props.attribute.name}-multiple-selection`}
              className="text-sm font-normal cursor-pointer"
            >
              Multiple Selection
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${props.attribute.name}-search-in-options`}
              checked={currentValue.searchInOptions}
              onCheckedChange={(checked) =>
                props.setValue({
                  ...currentValue,
                  searchInOptions: checked === true,
                })
              }
            />
            <label
              htmlFor={`${props.attribute.name}-search-in-options`}
              className="text-sm font-normal cursor-pointer"
            >
              Search in Options
            </label>
          </div>
        </div>
        <ValidationError>
          {error?._errors?.[0] ||
            error?.multipleSelection?._errors?.[0] ||
            error?.searchInOptions?._errors?.[0]}
        </ValidationError>
      </>
    );
  },
);
