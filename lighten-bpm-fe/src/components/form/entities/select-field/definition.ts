import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { datasourceTypeAttribute } from "../../attributes/datasource/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { selectAdvancedSettingAttribute } from "../../attributes/select-advanced-setting/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const selectFieldEntity = createEntity({
  name: EntityKey.selectField,
  attributes: [
    nameAttribute,
    widthAttribute,
    labelAttribute,
    placeholderAttribute,
    datasourceTypeAttribute,
    requiredAttribute,
    flowTypeAttribute,
    selectAdvancedSettingAttribute,
    readonlyAttribute,
    validatorAttribute,
    disabledAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    const schema = z.union([z.string().min(1), z.array(z.string()).min(1)]);

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    const optionalSchema = z
      .union([z.string(), z.array(z.string())])
      .optional();
    return optionalSchema.parse(value);
  },
  defaultValue(context) {
    const datasource = context.entity.attributes.datasourceType as
      | {
          type?: string;
          defaultValue?: { isReference?: boolean; value?: unknown };
        }
      | undefined;

    if (!datasource?.defaultValue) return undefined;

    const dv = datasource.defaultValue;
    if (dv.isReference) return undefined;

    const multipleSelection =
      (
        context.entity.attributes.selectAdvancedSetting as
          | { multipleSelection?: boolean }
          | undefined
      )?.multipleSelection ?? false;

    const value = dv.value;

    if (multipleSelection) {
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string");
      }
      if (typeof value === "string" && value) return [value];
      return undefined;
    }

    if (typeof value === "string" && value) return value;
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === "string"
    ) {
      return value[0] as string;
    }
    return undefined;
  },
});
