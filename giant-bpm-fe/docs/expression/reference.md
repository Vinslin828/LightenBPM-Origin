# Reference 表達式說明

Reference 是一個單行表達式，需回傳一個值。可使用
[Build-in Functions documentation](/doc#buildin) 中列出的內建函式。

## Built-in Functions

支援：

- `getFormField()`
- `getApplication()`
- `getApplicantProfile()`
- `Date()`
<!-- - `getMasterData()` -->

更多細節與範例請參考 [Build-in Functions documentation](/doc#buildin)。

## Examples

```ts
getApplicantProfile().name;
```

```ts
getFormField("field_name").value;
```

```ts
Date.now();
```

```ts
getApplication().appliedAt;
```

```ts
!!getFormField("field_a").value || !!getFormField("field_b").value
  ? "total: " + (getFormField("field_a").value + getFormField("field_b").value)
  : undefined;
```

## Fallback

若 Reference 表達式在執行時失敗，會回傳 `undefined`。
對於 label 屬性，UI 會回退顯示 fieled name。
