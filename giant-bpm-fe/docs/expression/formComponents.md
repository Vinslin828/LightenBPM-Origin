# Form Components

This document lists form components and their value type. These types map to
`getFormField(fieldName).value`.

Notes

- If a field is not filled in yet, the value is `undefined` (unless noted).
- Toggle is special: when not filled, the value is `false`.
- `grid`, `button`, `file_upload` are not documented here because they are not
  defined yet.

## Value Types

| Component   | Value type                        | Default value | Notes                           |
| ----------- | --------------------------------- | ------------- | ------------------------------- |
| `input`     | `string \| undefined`             | `undefined`   |                                 |
| `textarea`  | `string \| undefined`             | `undefined`   |                                 |
| `number`    | `number \| undefined`             | `undefined`   |                                 |
| `dropdown`  | `string \| string[] \| undefined` | `undefined`   |                                 |
| `checkbox`  | `string[] \| undefined`           | `undefined`   |                                 |
| `radio`     | `string \| undefined`             | `undefined`   |                                 |
| `toggle`    | `boolean`                         | `false`       | Defaults to `false` when empty |
| `date`      | `number \| undefined`             | `undefined`   |                                 |
| `currency`  | `number \| undefined`             | `undefined`   | `.currencyCode` returns selected currency (e.g., `"USD"`) |
| `separator` | `undefined`                       | `undefined`   | Decorative only                 |
