# Validation Expression 說明

Validation 是一個函式，回傳 boolean 或指定格式的物件。可使用
[Build-in Functions documentation](/doc#buildin) 中列出的內建函式。

## 內建全域函式 Built-in Functions

Supported:

- `getFormField()`
- `getApplication()`
- `getApplicantProfile()`
- `Date()`
<!-- - `getMasterData()` -->

See [Build-in Functions documentation](/doc#buildin) for details and examples.

## 參數

此參數只有在使用者開始填寫表單時才會有值，否則預設為 `undefined`。

```ts
{
  value: string | string[] | number | boolean | null | undefined;
}
```

## 回傳值

1. `boolean`
2. `{ isValid: true, error: null }`
3. `{ isValid: false, error: string }`

## 範例

```ts
function validation(value) {
  return true;
}
```

```ts
// 這個欄位的值必須包含 "yes"
// 例如：是否同意使用條款？(radio button)(yes/no)，規定使用者必須選擇 yes
function validation(value) {
  return value ? value.includes("yes") : false;
}
```

```ts
// 這個欄位的值必填，且必須大於 1 並小於 10
function validation(value) {
  return value ? value > 1 && value < 10 : false;
}
```

```ts
// 這個欄位的值必填，且日期必須為今天之前
function validation(value) {
  return value ? value < Date.now() : false;
}
```

```ts
// 回傳自訂錯誤訊息
// 此欄位的值不可以包含 "no"
// 此欄位為必填
// 此欄位的值必須包含 "yes"
function validation(value) {
  if (value?.includes("no")) {
    return false; // 顯示預設的錯誤訊息
  }
  if (!value) {
    return {
      isValid: false,
      error: "此欄位為必填。",
    };
  } else if (!value.includes("yes")) {
    return {
      isValid: false,
      error: "必須包含 yes。",
    };
  }

  return true;
}

// value: "yes"   -> (pass)
// value: "no"    -> 預設的錯誤訊息
// value: "yesno" -> 預設的錯誤訊息
// value: ""      -> 此欄位為必填。
// value: "123"   -> 必須包含 yes。
```

```ts
// form level validation
function validation() {
  const start = getFormField("date_8xwf24").value;
  const end = getFormField("date_kcmxqn").value;
  if (start < end) {
    return true;
  }
  return false;
}
```

## Fallback

若驗證 Expression 在執行時發生錯誤，會在 console 中輸出警告訊息。
