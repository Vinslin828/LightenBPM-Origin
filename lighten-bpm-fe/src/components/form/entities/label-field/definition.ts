import { z } from "zod";
import { createEntity } from "@coltorapps/builder";
import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { richTextAttribute } from "../../attributes/rich-text/definition";
import { EntityKey } from "@/types/form-builder";
import { requiredAttribute } from "../../attributes/required/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const labelFieldEntity = createEntity({
  name: EntityKey.labelField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    richTextAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value) {
    // Label is decorative and does not store a value
    return z.undefined().optional().parse(value);
  },
  defaultValue() {
    return undefined;
  },
});
