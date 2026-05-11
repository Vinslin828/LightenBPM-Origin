import { FormSetting } from "@/types/form-builder";
import ValidatorBlock from "./validatorBlock";
import { Toggle } from "@ui/toggle";

type Props = {
  validation: FormSetting["validation"];
  updateValidation: (validation: FormSetting["validation"]) => void;
};
export default function Validation(props: Props) {
  const { validation, updateValidation } = props;

  const updateValidator = (
    index: number,
    next: FormSetting["validation"]["validators"][number],
  ) => {
    const nextValidators = validation.validators.map((validator, idx) =>
      idx === index ? next : validator,
    );
    updateValidation({ ...validation, validators: nextValidators });
  };

  const removeValidator = (index: number) => {
    const nextValidators = validation.validators.filter(
      (_, idx) => idx !== index,
    );
    updateValidation({ ...validation, validators: nextValidators });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row justify-between">
        <span className="text-dark font-medium">Required</span>
        <Toggle
          pressed={validation.required}
          onPressedChange={(value) => {
            // When enabling, auto-add a first validator if the list is empty
            const validators =
              value && validation.validators.length === 0
                ? [
                    {
                      key: `validator_${Date.now()}`,
                      listenFieldIds: [],
                      code: undefined,
                      description: undefined,
                      errorMessage: undefined,
                      isApi: false,
                    },
                  ]
                : validation.validators;
            updateValidation({ ...validation, required: value, validators });
          }}
        />
      </div>
      {validation.required && validation.validators.length === 0 && (
        <div className="text-sm text-secondary-text text-center py-2">
          Click <span className="font-semibold text-lighten-blue">+</span> to add a validator.
        </div>
      )}
      {validation.required &&
        validation.validators.map((validator, index) => (
          <ValidatorBlock
            key={validator.key}
            index={index}
            validator={validator}
            onUpdate={(next) => updateValidator(index, next)}
            onRemove={() => removeValidator(index)}
          />
        ))}
      {/* <button
        type="button"
        onClick={addValidator}
        className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        Add validation
      </button> */}
    </div>
  );
}
