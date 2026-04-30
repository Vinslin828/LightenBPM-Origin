import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { buttonTextAttribute } from "../../attributes/button-text/definition";
import { apiCodeAttribute } from "../../attributes/api-code/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { EntityKey } from "@/types/form-builder";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { hideResponseDataAttribute } from "../../attributes/hide-response-data/definition";

export const buttonApiEntity = createEntity({
  name: EntityKey.buttonApi,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    buttonTextAttribute,
    hideResponseDataAttribute,
    apiCodeAttribute,
    readonlyAttribute,
    disabledAttribute,
    requiredAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    return z.string().optional().parse(value);
  },
  defaultValue(context) {
    return undefined;
  },
  shouldBeProcessed: () => true,
});
