import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { buttonTextAttribute } from "../../attributes/button-text/definition";
import { targetFileUrlAttribute } from "../../attributes/target-file-url/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";

export const fileDownloadFieldEntity = createEntity({
  name: EntityKey.buttonDownload,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    buttonTextAttribute,
    targetFileUrlAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    // File download is an action button, no user-input value to validate
    return z.undefined().optional().parse(value);
  },
  defaultValue(context) {
    return undefined;
  },
});
