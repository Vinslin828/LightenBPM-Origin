import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { buttonTextAttribute } from "../../attributes/button-text/definition";
import { targetUrlAttribute } from "../../attributes/target-url/definition";
import { isButtonAttribute } from "../../attributes/is-button/definition";
import { openNewTabAttribute } from "../../attributes/open-new-tab/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const buttonUrlEntity = createEntity({
  name: EntityKey.buttonUrl,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    isButtonAttribute,
    buttonTextAttribute,
    targetUrlAttribute,
    openNewTabAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    return z.undefined().optional().parse(value);
  },
  defaultValue(context) {
    return undefined;
  },
});
