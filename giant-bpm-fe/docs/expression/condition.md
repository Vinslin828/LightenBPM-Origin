# Condition Expression 說明

Condition 是一個 **必須回傳 boolean 值** 的函式。
可使用 [Build-in Functions documentation](/doc#buildin) 中列出的內建函式。

## 內建函式

支援：

- `getFormField()`
- `getApplication()`
- `getApplicantProfile()`
- `Date()`
  <!-- - `getCurrentNode()` -->
  <!-- - `getMasterData()` -->

更多細節與範例請參考 [Build-in Functions documentation](/doc#buildin)。

## 參數

Condition Expression **不接受任何輸入參數**。

## 回傳值

- 僅允許回傳 boolean（`true` / `false`）

## 範例

```ts
function condition() {
  return getFormField("a").value === getFormField("b").value;
}
```

```ts
function condition() {
  return getFormField("total").value > 100000;
}
```

```ts
function condition() {
  return getApplicantProfile().jobGrade > 60;
}
```

```ts
function condition() {
  const a = getFormField("a").value;
  const b = getFormField("b").value;
  return a > 5 && b < 10;
}
```

## 執行方式

waiting for design

## Fallback

waiting for design
