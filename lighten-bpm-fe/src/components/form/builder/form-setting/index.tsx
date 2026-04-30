import { PlusIcon, SettingsIcon } from "@/components/icons";
import AttributePanelHeader from "../../entities/attribute-panel-header";
import Accordion from "@ui/accordion";
import { EntityKey } from "@/types/form-builder";
import { useAtom } from "jotai";
import { formSettingAtom } from "@/store";
import Validation from "./validation";

export default function FormSetting() {
  const [formSetting, setFormSetting] = useAtom(formSettingAtom);

  const addValidator = () => {
    const nextValidator = {
      key: `validator_${Date.now()}`,
      listenFieldIds: [],
      code: undefined,
      description: undefined,
      errorMessage: undefined,
      isApi: false,
    };
    setFormSetting({
      ...formSetting,
      validation: {
        ...formSetting.validation,
        validators: [...formSetting.validation.validators, nextValidator],
      },
    });
  };
  return (
    <div className="border-l border-gray-200 sticky right-0 flex-1 max-w-[360px] overflow-y-auto bg-white">
      <>
        <AttributePanelHeader
          icon={<SettingsIcon className="text-secondary-text" />}
          componentType={null}
          className="bg-gray-2 border-secondary-text"
        />
        <Accordion
          key={EntityKey.textField}
          defaultOpenAll
          items={[
            {
              key: "validation",
              name: (
                <div className="flex flex-row justify-between w-full">
                  <div className="flex flex-row gap-2 items-center">
                    Validation
                    <span className="w-5 h-5 rounded-full bg-lighten-blue text-white text-xs font-medium text-center flex items-center justify-center">
                      {formSetting.validation.validators.length}
                    </span>
                  </div>
                  <span
                    onClick={(e) => {
                      if (!formSetting.validation.required) {
                        return;
                      }
                      e.stopPropagation();
                      addValidator();
                    }}
                    className={
                      formSetting.validation.required
                        ? "text-lighten-blue"
                        : "text-secondary-text"
                    }
                  >
                    <PlusIcon />
                  </span>
                </div>
              ),
              content: (
                <div className="flex flex-col gap-4">
                  <Validation
                    validation={formSetting.validation}
                    updateValidation={(validation) =>
                      setFormSetting({ ...formSetting, validation })
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      </>
    </div>
  );
}
