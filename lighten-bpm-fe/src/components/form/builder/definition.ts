import { createBuilder } from "@coltorapps/builder";

import { datePickerFieldEntity } from "../entities/date-picker/definition";
import { selectFieldEntity } from "../entities/select-field/definition";
import { textFieldEntity } from "../entities/text-field/definition";
import { textareaFieldEntity } from "../entities/textarea-field/definition";
import { checkboxFieldEntity } from "../entities/check-box/definition";
import { numberFieldEntity } from "../entities/number-field/definition";
import { radioButtonEntity } from "../entities/radio-button/definition";
import { toggleFieldEntity } from "../entities/toggle-field/definition";
import { fileUploadFieldEntity } from "../entities/file-upload-field/definition";
import { fileDownloadFieldEntity } from "../entities/file-download-field/definition";
import { separatorFieldEntity } from "../entities/separator-field/definition";
import { currencyFieldEntity } from "../entities/currency/definition";
import { gridEntity } from "../entities/grid/definition";
import { buttonUrlEntity } from "../entities/button-url/definition";
import { buttonApiEntity } from "../entities/button-api/definition";
import { containerEntity } from "../entities/container/definition";
import { expressionFieldEntity } from "../entities/expression/definition";
import { labelFieldEntity } from "../entities/label-field/definition";

export const basicFormBuilder = createBuilder({
  entities: [
    textFieldEntity,
    textareaFieldEntity,
    numberFieldEntity,
    currencyFieldEntity,
    selectFieldEntity,
    datePickerFieldEntity,
    // paragraphEntity,
    gridEntity,
    checkboxFieldEntity,
    radioButtonEntity,
    toggleFieldEntity,
    fileUploadFieldEntity,
    fileDownloadFieldEntity,
    buttonUrlEntity,
    buttonApiEntity,
    containerEntity,
    expressionFieldEntity,
    separatorFieldEntity,
    labelFieldEntity,
  ],
});
