import { createEntity } from "@coltorapps/builder";
import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { buttonTextAttribute } from "../../attributes/button-text/definition";
import { isButtonAttribute } from "../../attributes/is-button/definition";
import { targetUrlAttribute } from "../../attributes/target-url/definition";
import { openNewTabAttribute } from "../../attributes/open-new-tab/definition";
import { z } from "zod";
import { EntityKey } from "@/types/form-builder";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";

export const buttonUrlFieldEntity = createEntity({
  name: EntityKey.buttonApi,
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
  ],
  validate: (entity) => {
    return z
      .object({
        type: z.literal("button_url"),
        attributes: z.object({
          width: widthAttribute.validate,
          name: nameAttribute.validate,
          label: labelAttribute.validate,
          isButton: isButtonAttribute.validate,
          buttonText: buttonTextAttribute.validate,
          targetUrl: targetUrlAttribute.validate,
          openNewTab: openNewTabAttribute.validate,
          required: requiredAttribute.validate,
        }),
      })
      .parse(entity);
  },
});
