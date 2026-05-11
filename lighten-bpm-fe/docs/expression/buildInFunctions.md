# Custom Expression 使用說明

## 內建全域函式（Built-in Functions）

系統提供以下內建函式，可直接在表達式中使用。

### getFormField(formFieldName: string)

取得表單欄位目前的值。

參數

- formFieldName：表單欄位的名稱（欄位 Name）

回傳值

```ts
{
  value: string | string[] | number | boolean | null | undefined;
  currencyCode?: string; // 僅 currency 欄位會回傳
}
```

範例

```ts
getFormField("text_9aidfc").value; // 'HR'
getFormField("toggle_ncibme").value; // true
getFormField("number_olp94x").value; // 80

// currency 欄位
getFormField("currency_abc123").value; // 1500.50
getFormField("currency_abc123").currencyCode; // 'USD'
```

## Dynamic Field Status Expression

用於欄位的 Dynamic Status 設定。Expression 需要回傳狀態代碼陣列，系統會依照回傳值動態控制元件狀態。

可用狀態代碼

- `HD`：Hide，隱藏元件
- `SH`：Show，顯示元件（可覆蓋表單設計中的靜態 Hide）
- `RQ`：Required，設為必填
- `RO`：Read only，設為唯讀
- `DS`：Disabled，設為停用

### 狀態代碼優先順序

Expression 可以回傳一個或多個狀態代碼，例如 `["RQ", "RO"]`。

同一個 Expression 回傳多個狀態時，規則如下：

- `HD` 優先於 `SH`。如果同時回傳 `["HD", "SH"]`，元件會被隱藏。
- `SH` 只用來覆蓋表單設計中的靜態 Hide，讓原本被靜態隱藏的元件顯示。
- `RQ`、`RO`、`DS` 可以同時生效。例如 `["RQ", "RO"]` 代表必填且唯讀。
- 回傳空陣列 `[]` 代表不套用任何動態狀態，元件會回到靜態設定或 Flow 設定決定的狀態。

### Static / Dynamic / Flow 優先順序

欄位狀態可能來自三個來源：

- Static setting：表單設計時設定的 Hide / Required / Read only / Disabled。
- Dynamic setting：欄位 Dynamic Status Expression 回傳的 `HD` / `SH` / `RQ` / `RO` / `DS`。
- Flow setting：Flow design 中針對表單或簽核節點設定的 component visibility / editable / disabled / required。

整體優先順序如下：

1. Flow setting 最高優先。Flow 隱藏的欄位會由後端移除，Dynamic Status 不能用 `SH` 顯示回來。
2. Dynamic setting 次優先。Dynamic Status 可以加強或覆蓋表單靜態設定，例如用 `SH` 顯示靜態隱藏的欄位，或用 `RQ` 讓欄位變必填。
3. Static setting 是預設狀態。當 Dynamic Status 回傳 `[]` 或未啟用時，欄位使用表單設計中的靜態設定。

簡化規則：

```ts
// Hide / Show
Flow hide > Dynamic HD > Dynamic SH > Static hide

// Required
Flow required OR Dynamic RQ OR Static required

// Read only
Flow readonly OR Dynamic RO OR Static readonly

// Disabled
Flow disabled OR Dynamic DS OR Static disabled
```

### 依欄位是否有值來顯示或隱藏元件

如果 `apcntDep` 有值就顯示目前元件，沒有值就隱藏：

```ts
function expression() {
  const value = getFormField("apcntDep").value;

  if (value !== undefined && value !== null && String(value).trim() !== "") {
    return ["SH"];
  }

  return ["HD"];
}
```

簡短寫法：

```ts
function expression() {
  return getFormField("apcntDep").value ? ["SH"] : ["HD"];
}
```

如果欄位值可能是 Dropdown / Reference 物件，可用較安全的寫法：

```ts
function expression() {
  const field = getFormField("apcntDep");
  const value = field.value?.value ?? field.value;

  return value ? ["SH"] : ["HD"];
}
```

### getApplicantProfile()

取得申請人的基本資料。

回傳物件結構

```ts
{
  id: string;
  lang: string; // 'zh-TW', "en"
  name: string;
  email: string;
  jobGrade: number;
  defaultOrgId: string;
  defaultOrgName: string;
}
```

範例

```ts
getApplicantProfile().jobGrade; // 40
getApplicantProfile().defaultOrgId; // 4
getApplicantProfile().defaultOrgName; // "GSM"
getApplicantProfile().name; // "John Doe"
```

### getApplication()

取得目前申請單的資料。

回傳物件結構

```ts
{
  serialNumber: string;
  appliedAt: number; // epoch time
  applicantId: string; // user id
}
```

範例

```ts
getApplication().serialNumber; // "APP-1768459691940"
getApplication().appliedAt; // 1769616000000
getApplication().applicantId; // "E123"
```

### getCurrentNode()

僅能在 workflow builder 中使用，用以取得目前 workflow node 的資料。

TODO: getComment(approvalTaskId: string), getWorkflowId, getFormId, getApplication…

回傳物件結構

```json
{
  "key": "Approval-1768208512637",
  "type": "approval",
  "status": "pending",
  "desc": "",
  "parent_keys": ["form-node"],
  "child_keys": ["end-node"],
  "approvalMethod": "single",
  "approvalGroups": [
    {
      "approvals": [
        {
          "approvalTaskId": "f5546dae-6ffa-4b8f-b33e-827720caa9f1",
          "assignee": {
            "id": 17,
            "sub": "77247a28-0071-70f5-4199-623b172b6ed3",
            "name": "Stella Yang",
            "email": "stella.yang@bahwancybertek.com",
            "job_grade": 20,
            "default_org_id": 1,
            "created_at": "2025-12-09T05:30:31.904Z",
            "updated_at": "2025-12-09T05:30:31.904Z"
          },
          "status": "PENDING"
        }
      ],
      "isReportingLine": false,
      "desc": ""
    }
  ]
}
```

範例

```
???
```

### Date

取得當下的時間。

範例
https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Date

```javascript
Date.now(); // 1770172808, 取得當下的時間
Date.parse("2024-01-01 09:33"); // 1704072780, 2024/1/1 9:33
```

### getMasterData(tableKey: string, query?: object)

取得使用者自己定義的 master data 資料。

可帶入 `query`：

- `filter`
- `sort`
- `select`
- `page`（預設 1）
- `limit`

範例 table：`currency_table`

| id  | currency_code | currency_name | decimal_digits |
| --- | ------------- | ------------- | -------------- |
| 0   | USD           | 美金          | 2              |
| 1   | TWD           | 台幣          | 0              |
| 2   | JPY           | 日圓          | 0              |

範例

```ts
getMasterData("currency_table")[0].currency_code; // "USD"
getMasterData("currency_table").find((v) => v.currency_code === "USD")
  ?.decimal_digits; // 2
getMasterData("currency_table").find((v) => v.currency_code === "USD")
  ?.decimal_digits == 4; // false
```

```ts
getMasterData("currency_table", { filter: { currency_code: "TWD" } }); // DB level filter
getMasterData("currency_table").filter((v) => v.currency_code == "TWD"); // JS native，效能較差（先取全量資料再 filter）

getMasterData("currency_table", {
  sort: { field: "decimal_digits", order: "desc" },
}); // DB level sort
getMasterData("currency_table").sort((a, b) => b.decimal_digits - a.decimal_digits); // JS native，效能較差（先取全量資料再 sort）

getMasterData("currency_table", {
  select: ["currency_code", "currency_name"],
});

getMasterData("currency_table", { page: 2, limit: 10 });
```

---

### callExternalApi(url: string, options?: object)

透過後端 proxy 呼叫外部 API，可避免瀏覽器 CORS 限制。

> **Note:** 第一次呼叫時回傳 `null`（後端請求進行中），待回應到達後元件會自動重新計算，並回傳實際資料。請在表達式中處理 `null` 的情況。

參數

- `url`：目標 API 的完整網址
- `options`（選填）：
  - `method`：HTTP 方法，預設 `"GET"`（可選 `"GET"` / `"POST"` / `"PUT"` / `"PATCH"` / `"DELETE"`）
  - `params`：附加至網址的 query string 參數（`Record<string, string>`）
  - `headers`：HTTP headers（`Record<string, string>`）
  - `body`：Request body，會自動序列化為 JSON

回傳值

後端 API 的 JSON response body（可能為物件、陣列或純值）。若資料尚未取回，暫時回傳 `null`。

範例

```ts
// 基本 GET 請求
const data = callExternalApi("https://api.example.com/items");
data?.[0]?.name; // "Widget A"（第一筆資料的 name 欄位）

// 帶 query params
const item = callExternalApi("https://api.example.com/parts", {
  params: { code: "P-001" },
});
item?.spec_name ?? ""; // "Stainless Steel Bolt"

// 帶認證 header
const profile = callExternalApi("https://api.example.com/profile", {
  headers: { Authorization: "Bearer your-token" },
});
profile?.department ?? ""; // "Engineering"

// POST 請求
const result = callExternalApi("https://api.example.com/lookup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: { query: getFormField("keyword").value },
});
result?.matched_count ?? 0; // 42

// 結合 getFormField — 依表單欄位動態查詢
const partCode = getFormField("part_code").value;
const part = callExternalApi("https://erp.internal/api/parts", {
  params: { code: String(partCode ?? "") },
});
part?.unit_price ?? ""; // "120.00"
```

若 API 回傳陣列，可用 JavaScript 原生陣列方法處理：

```ts
const list = callExternalApi("https://api.example.com/tags");
if (!Array.isArray(list)) return "";
list.map((t) => t.name).join(", "); // "A, B, C"
```

---

## Grid 欄位專用函式

以下函式**僅在 Grid 欄位的 Expression 類型**中可使用，用來讀取同一列的其他欄位值。

### getRowField(columnKey: string)

取得目前列（row）中指定欄位的值。

參數

- `columnKey`：Grid 欄位的 Key（欄位設定中的 `Key` 值）

回傳值

```ts
{ value: string | number | boolean | null }
```

範例

以下是一個 Grid，欄位設定如下：

| 欄位 Label | 欄位 Key  | 類型       |
| ---------- | --------- | ---------- |
| 品名       | part_name | Dropdown   |
| 數量       | qty       | Number     |
| 單價       | unit_price| Number     |
| 小計       | subtotal  | Expression |
| 規格       | spec      | Expression |

**範例 1 — 計算小計（數量 × 單價）**

```ts
function expression() {
  const qty = getRowField("qty").value;
  const unitPrice = getRowField("unit_price").value;
  if (qty == null || unitPrice == null) return "";
  return qty * unitPrice;
}
```

**範例 2 — 從 Master Data 查詢規格**

```ts
function expression() {
  const partName = getRowField("part_name").value;
  if (!partName) return "";

  const records = getMasterData("PartMast", {
    filter: { part_name: partName },
  });
  return records?.[0]?.spec ?? "";
}
```

**範例 3 — 從外部 API 查詢規格（callExternalApi）**

```ts
function expression() {
  const partCode = getRowField("part_code").value;
  if (!partCode) return "";

  const data = callExternalApi("https://erp.internal/api/parts", {
    params: { code: String(partCode) },
    headers: { Authorization: "Bearer your-token" },
  });

  // data 首次呼叫為 null（請求進行中），請加 null guard
  return data?.spec_name ?? "";
}
```

**範例 4 — 組合多個欄位產生描述文字**

```ts
function expression() {
  const name = getRowField("part_name").value;
  const qty = getRowField("qty").value;
  if (!name || qty == null) return "";
  return `${name} × ${qty}`;
}
```
