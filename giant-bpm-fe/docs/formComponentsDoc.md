# Form Components Definition

Notes

- Examples are extracted from a single schema and may omit optional attributes.
- Attribute names match the schema keys used in form definitions.

```ts
type Refernece =
  | {
      isReference?: false;
      value: string;
    }
  | { isReference: true; reference: string; value?: string };

type Option = {
  label: string;
  value: string;
  key: string;
};

export enum EntityKey {
  textField = "input",
  textareaField = "textarea",
  numberField = "number",
  selectField = "dropdown",
  datePickerField = "date",
  demoGrid = "grid",
  grid = "grid",
  checkboxField = "checkbox",
  radioButton = "radio",
  toggleField = "toggle",
  buttonField = "button",
  fileUploadField = "file_upload",
  separatorField = "separator",
  currencyField = "currency",
}
```

## input

Attributes

| Attribute      | Type                                                                                     | Notes        |
| -------------- | ---------------------------------------------------------------------------------------- | ------------ |
| `width`        | `number`                                                                                 | Integer 1-12 |
| `name`         | `string`                                                                                 | Required     |
| `label`        | `Reference`                                                                              | Required     |
| `inputType`    | `"text" \| "number" \| "password" \| "date" \| "time" \| "datetime-local" \| "textarea"` | Required     |
| `placeholder`  | `Reference`                                                                              | Optional     |
| `disabled`     | `boolean`                                                                                | Optional     |
| `readonly`     | `boolean`                                                                                | Optional     |
| `defaultValue` | `Reference`                                                                              | Optional     |
| `required`     | `boolean`                                                                                | Optional     |
| `flowType`     | `("split" \| "recursive" \| "others")[]`                                                 | Optional     |
| `validator`    | `{ required?: boolean; validatorId?: string; code?: string }`                            | Optional     |

Example entity schema

```json
{
  "attributes": {
    "width": 12,
    "name": "text_ixkpo2",
    "label": { "value": "Text Field" },
    "inputType": "text",
    "placeholder": "Enter text",
    "disabled": false,
    "readonly": false,
    "defaultValue": { "isReference": false },
    "required": false,
    "validator": { "required": false }
  },
  "type": "input"
}
```

## textarea

Attributes

| Attribute      | Type                                                          | Notes        |
| -------------- | ------------------------------------------------------------- | ------------ |
| `width`        | `number`                                                      | Integer 1-12 |
| `name`         | `string`                                                      | Required     |
| `label`        | `Reference`                                                   | Required     |
| `placeholder`  | `Reference`                                                   | Optional     |
| `defaultValue` | `Reference`                                                   | Optional     |
| `required`     | `boolean`                                                     | Optional     |
| `disabled`     | `boolean`                                                     | Optional     |
| `readonly`     | `boolean`                                                     | Optional     |
| `flowType`     | `("split" \| "recursive" \| "others")[]`                      | Optional     |
| `validator`    | `{ required?: boolean; validatorId?: string; code?: string }` | Optional     |

Example entity schema

```json
{
  "attributes": {
    "name": "textarea_cnbehk",
    "width": 12,
    "label": { "value": "Textarea Field" },
    "placeholder": "Type here...",
    "defaultValue": { "isReference": false },
    "required": false
  },
  "type": "textarea"
}
```

## number

Attributes

| Attribute       | Type                                                                                                             | Notes                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `width`         | `number`                                                                                                         | Integer 1-12           |
| `name`          | `string`                                                                                                         | Required               |
| `label`         | `Reference`                                                                                                      | Required               |
| `defaultValue`  | `{ isReference?: false; value?: number } \| { isReference: true; reference?: string; value?: number \| string }` | Optional               |
| `decimalDigits` | `number`                                                                                                         | Integer 0-20, optional |
| `required`      | `boolean`                                                                                                        | Optional               |
| `min`           | `number`                                                                                                         | Optional               |
| `max`           | `number`                                                                                                         | Optional               |
| `expression`    | `string`                                                                                                         | Optional               |
| `step`          | `number`                                                                                                         | Optional               |
| `readonly`      | `boolean`                                                                                                        | Optional               |
| `validator`     | `{ required?: boolean; validatorId?: string; code?: string }`                                                    | Optional               |

Example entity schema

```json
{
  "attributes": {
    "width": 12,
    "label": { "value": "Number Field" },
    "name": "number_mvm9dq",
    "defaultValue": { "isReference": false },
    "required": false,
    "expression": "",
    "decimalDigits": 0
  },
  "type": "number"
}
```

## dropdown

Attributes

| Attribute               | Type                                                                                                                                                                                                                                                                               | Notes        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `width`                 | `number`                                                                                                                                                                                                                                                                           | Integer 1-12 |
| `name`                  | `string`                                                                                                                                                                                                                                                                           | Required     |
| `label`                 | `Reference`                                                                                                                                                                                                                                                                        | Required     |
| `placeholder`           | `Reference`                                                                                                                                                                                                                                                                        | Optional     |
| `datasourceType`        | `{ type: "static"; options: Option[]; defaultValue?: { isReference?: false; value?: string \| string[] } \| { isReference: true; reference?: string; value?: string \| string[] } } \| { type: "table"; datasourceListId?: string; datasourceColumnId?: string; filter?: string }` | Required     |
| `required`              | `boolean`                                                                                                                                                                                                                                                                          | Optional     |
| `flowType`              | `("split" \| "recursive" \| "others")[]`                                                                                                                                                                                                                                           | Optional     |
| `selectAdvancedSetting` | `{ multipleSelection: boolean; searchInOptions: boolean }`                                                                                                                                                                                                                         | Required     |
| `readonly`              | `boolean`                                                                                                                                                                                                                                                                          | Optional     |
| `validator`             | `{ required?: boolean; validatorId?: string; code?: string }`                                                                                                                                                                                                                      | Optional     |

Example entity schema

```json
{
  "attributes": {
    "width": 12,
    "label": { "value": "Dropdown Field" },
    "name": "select_rp6pfr",
    "placeholder": "Select an option",
    "required": false,
    "datasourceType": {
      "type": "static",
      "options": [
        { "label": "Option 1", "value": "option1", "key": "option_1" }
      ]
    },
    "selectAdvancedSetting": {
      "multipleSelection": false,
      "searchInOptions": false
    }
  },
  "type": "dropdown"
}
```

## date

Attributes

| Attribute      | Type                                                                                                             | Notes                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `width`        | `number`                                                                                                         | Integer 1-12                 |
| `name`         | `string`                                                                                                         | Required                     |
| `label`        | `Reference`                                                                                                      | Required                     |
| `dateSubtype`  | `"date" \| "time" \| "datetime"`                                                                                 | Optional, defaults to `date` |
| `required`     | `boolean`                                                                                                        | Optional                     |
| `disabled`     | `boolean`                                                                                                        | Optional                     |
| `readonly`     | `boolean`                                                                                                        | Optional                     |
| `flowType`     | `("split" \| "recursive" \| "others")[]`                                                                         | Optional                     |
| `defaultValue` | `{ isReference?: false; value?: number } \| { isReference: true; reference?: string; value?: number \| string }` | Optional                     |
| `validator`    | `{ required?: boolean; validatorId?: string; code?: string }`                                                    | Optional                     |

Example entity schema

```json
{
  "attributes": {
    "width": 12,
    "name": "date_zgddew",
    "label": { "value": "Date Picker Field" },
    "required": false,
    "disabled": false,
    "readonly": false,
    "dateSubtype": "date",
    "defaultValue": { "isReference": false }
  },
  "type": "date"
}
```

## currency

Attributes

| Attribute       | Type                                                                                                                                           | Notes                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `width`         | `number`                                                                                                                                       | Integer 1-12           |
| `name`          | `string`                                                                                                                                       | Required               |
| `label`         | `Reference`                                                                                                                                    | Required               |
| `currencyList`  | `string`                                                                                                                                       | Required               |
| `currencyCode`  | `"AUD" \| "CAD" \| "CHF" \| "CNY" \| "EUR" \| "GBP" \| "HKD" \| "HUF" \| "JPY" \| "KRW" \| "MXN" \| "PLN" \| "THB" \| "TWD" \| "USD" \| "VND"` | Required               |
| `decimalDigits` | `number`                                                                                                                                       | Integer 0-20, optional |
| `defaultValue`  | `{ isReference?: false; value?: number } \| { isReference: true; reference?: string; value?: number \| string }`                               | Optional               |
| `required`      | `boolean`                                                                                                                                      | Optional               |
| `flowType`      | `("split" \| "recursive" \| "others")[]`                                                                                                       | Optional               |
| `readonly`      | `boolean`                                                                                                                                      | Optional               |
| `validator`     | `{ required?: boolean; validatorId?: string; code?: string }`                                                                                  | Optional               |

Example entity schema

```json
{
  "attributes": {
    "name": "currency_qpvbzk",
    "width": 12,
    "label": { "value": "Currency" },
    "currencyList": "default-list",
    "currencyCode": "USD",
    "decimalDigits": 0,
    "defaultValue": { "isReference": false },
    "required": false
  },
  "type": "currency"
}
```

## checkbox

Attributes

| Attribute      | Type                                                                                                                 | Notes        |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| `width`        | `number`                                                                                                             | Integer 1-12 |
| `name`         | `string`                                                                                                             | Required     |
| `label`        | `Reference`                                                                                                          | Required     |
| `defaultValue` | `{ isReference?: false; value?: Option[] } \| { isReference: true; reference?: string; value?: Option[] \| string }` | Optional     |
| `options`      | `Option[]`                                                                                                           | Required     |
| `flowType`     | `("split" \| "recursive" \| "others")[]`                                                                             | Optional     |
| `required`     | `boolean`                                                                                                            | Optional     |
| `validator`    | `{ required?: boolean; validatorId?: string; code?: string }`                                                        | Optional     |

Example entity schema

```json
{
  "attributes": {
    "width": 12,
    "name": "checkbox_1rt56x",
    "label": { "value": "Checkbox" },
    "defaultValue": { "isReference": false, "value": null },
    "options": [
      { "label": "Option 1", "value": "option_1", "key": "option_1" },
      { "label": "Option 2", "value": "option_2", "key": "option_2" }
    ],
    "required": false
  },
  "type": "checkbox"
}
```

## radio

Attributes

| Attribute        | Type                                                                                                   | Notes        |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| `width`          | `number`                                                                                               | Integer 1-12 |
| `name`           | `string`                                                                                               | Required     |
| `label`          | `Reference`                                                                                            | Required     |
| `defaultValue`   | `{ isReference?: false; value?: string } \| { isReference: true; reference?: string; value?: string }` | Optional     |
| `readonly`       | `boolean`                                                                                              | Optional     |
| `required`       | `boolean`                                                                                              | Optional     |
| `options`        | `Option[]`                                                                                             | Required     |
| `groupDirection` | `"horizontal" \| "vertical"`                                                                           | Optional     |
| `flowType`       | `("split" \| "recursive" \| "others")[]`                                                               | Optional     |
| `validator`      | `{ required?: boolean; validatorId?: string; code?: string }`                                          | Optional     |

Example entity schema

```json
{
  "attributes": {
    "name": "radio_07xz74",
    "width": 12,
    "label": { "value": "Radio Button Field" },
    "required": false,
    "options": [
      { "label": "Option 1", "value": "option1", "key": "option_1" },
      { "label": "Option 2", "value": "option2", "key": "option_2" }
    ]
  },
  "type": "radio"
}
```

## toggle

Attributes

| Attribute      | Type                                                                                                               | Notes        |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| `width`        | `number`                                                                                                           | Integer 1-12 |
| `name`         | `string`                                                                                                           | Required     |
| `label`        | `Reference`                                                                                                        | Required     |
| `defaultValue` | `{ isReference?: false; value?: boolean } \| { isReference: true; reference?: string; value?: boolean \| string }` | Optional     |
| `required`     | `boolean`                                                                                                          | Optional     |
| `flowType`     | `("split" \| "recursive" \| "others")[]`                                                                           | Optional     |
| `validator`    | `{ required?: boolean; validatorId?: string; code?: string }`                                                      | Optional     |

Example entity schema

```json
{
  "attributes": {
    "name": "toggle_adai5q",
    "width": 12,
    "label": { "value": "Toggle Field" },
    "defaultValue": { "isReference": false, "value": false },
    "required": false
  },
  "type": "toggle"
}
```

## grid

Attributes

| Attribute     | Type        | Notes        |
| ------------- | ----------- | ------------ |
| `width`       | `number`    | Integer 1-12 |
| `name`        | `string`    | Required     |
| `label`       | `Reference` | Required     |
| `demoColumns` | `string[]`  | Required     |

Example entity schema

```json
{
  "attributes": {
    "name": "demo_bknhoa",
    "width": 12,
    "label": { "value": "Grid" },
    "demoColumns": ["Column 1"]
  },
  "type": "grid"
}
```

## button

Attributes

| Attribute | Type                                                                                                  | Notes        |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| `width`   | `number`                                                                                              | Integer 1-12 |
| `name`    | `string`                                                                                              | Required     |
| `label`   | `{ isReference?: false; value: string } \| { isReference: true; reference?: string; value?: string }` | Required     |

Example entity schema

```json
{
  "attributes": {
    "name": "button_ynv1lz",
    "width": 12,
    "label": { "value": "Button" }
  },
  "type": "button"
}
```

## file_upload

Attributes

| Attribute  | Type                                                                                                  | Notes        |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| `width`    | `number`                                                                                              | Integer 1-12 |
| `name`     | `string`                                                                                              | Required     |
| `label`    | `{ isReference?: false; value: string } \| { isReference: true; reference?: string; value?: string }` | Required     |
| `required` | `boolean`                                                                                             | Optional     |

Example entity schema

```json
{
  "attributes": {
    "name": "file_6g425t",
    "width": 12,
    "label": { "value": "File Upload Field" },
    "required": false
  },
  "type": "file_upload"
}
```

## separator

Attributes

| Attribute | Type                                                                                                  | Notes        |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| `width`   | `number`                                                                                              | Integer 1-12 |
| `name`    | `string`                                                                                              | Required     |
| `label`   | `{ isReference?: false; value: string } \| { isReference: true; reference?: string; value?: string }` | Required     |

Example entity schema

```json
{
  "attributes": {
    "name": "separator_y9fqrv",
    "width": 12,
    "label": { "value": "Separator" }
  },
  "type": "separator"
}
```
