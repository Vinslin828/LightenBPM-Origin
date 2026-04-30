import { useMemo, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { validatorAttribute } from "./definition";
import { useValidators } from "@/hooks/useValidator";
import { Validator } from "@/types/validator";
import useValidatorStore from "@/hooks/useValidatorStore";
import { SearchableSelect } from "@ui/select/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import CodeEditButton from "@ui/button/code-edit-button";

export const ValidatorAttribute = createAttributeComponent(
  validatorAttribute,
  function ValidationAttribute(props) {
    const [search, setSearch] = useState<string>();
    const debounceSearch = useDebounce(search, 700);
    props.entity.id;
    const { validators } = useValidators({
      name: debounceSearch,
      component: props.entity.type,
    });
    const { hasValidator, updateValidator, addValidator, getValidator } =
      useValidatorStore();

    const validatorOptions = useMemo(() => {
      return validators?.map((v) => ({
        label: v.name,
        key: v.id,
        value: v.id,
        validator: v,
      }));
    }, [validators]);

    function onValidatorChange(validator: Validator) {
      if (hasValidator(props.entity.id)) {
        updateValidator(props.entity.id, validator);
      } else {
        addValidator(props.entity.id, validator);
      }
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-row justify-between">
          <span className="text-dark font-medium text-base pb-2.5">
            Required
          </span>
          <Toggle
            pressed={props.attribute.value?.required ?? false}
            onPressedChange={(value) =>
              props.setValue({
                ...props.attribute.value,
                required: value,
              })
            }
          />
        </div>
        {props.attribute.value?.required && (
          <>
            <div>
              <div className="text-dark font-medium text-base pb-2.5">
                Validation Source
              </div>
              <SearchableSelect
                mode="single"
                options={validatorOptions ?? []}
                value={
                  getValidator(props.entity.id)?.id ??
                  props.attribute.value?.validatorId
                }
                onChange={(value) => {
                  props.setValue({
                    ...props.attribute.value,
                    validatorId: value,
                  });
                  const selectedValidator = validatorOptions?.find(
                    (option) => option.value === value,
                  )?.validator;
                  selectedValidator && onValidatorChange(selectedValidator);
                }}
                placeholder="Select Source"
                onSearchChange={(value) => setSearch(value)}
              />
            </div>
            <div>
              <div className="text-dark font-medium text-base pb-2.5">
                Validation Expression
              </div>
              <CodeEditButton
                variant="validation"
                value={
                  props.attribute.value?.code ??
                  "function validation(value) {\n return true;\n}"
                }
                isApi={props.attribute.value.isApi}
                showApiToggle
                trigger={props.attribute.value?.code}
                onSave={(code, d, e, isApi) =>
                  props.setValue({
                    ...props.attribute.value,
                    code,
                    isApi,
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    );
  },
);
