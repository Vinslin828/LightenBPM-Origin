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
}
```

範例

```ts
getApplicantProfile().jobGrade; // 40
getApplicantProfile().defaultOrgId; // 4
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
