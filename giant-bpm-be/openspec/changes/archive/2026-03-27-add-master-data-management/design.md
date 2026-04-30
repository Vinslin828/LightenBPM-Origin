# Design: Master Data Management (Physical Tables)

## Architecture
We will implement a **Dynamic Schema** pattern. The application will manage a set of "User Defined Tables" alongside the core application tables.

### 1. Meta-Data Layer (Prisma Managed)
A standard Prisma model will track the existence and definition of these dynamic tables.

**Entity: `DatasetDefinition`**
-   `id`: Int (PK)
-   `code`: String (Unique, e.g., `VENDORS`) - The **Logical ID** used for API lookups and migration.
-   `table_name`: String (Unique, e.g., `md_vendors`) - The **Physical Implementation** name.
-   `name`: String (Display Name)
-   `fields`: Json (Array of field definitions: `{ name: string, type: 'TEXT'|'NUMBER', required: boolean }`)
-   `created_by`: String (User Code) - Audit trail.
-   `updated_by`: String (User Code) - Audit trail.
-   `created_at`: DateTime
-   `updated_at`: DateTime

### 2. Physical Storage Layer (Runtime Managed)
When a `DatasetDefinition` is created, the service will execute raw SQL to create the table.
**Convention:** All tables are prefixed with `md_` to prevent collisions.

**Column Mapping (Fixed Restrictions):**
- `TEXT`: Maps to `VARCHAR(2000)`.
- `NUMBER`: Maps to `DECIMAL(20, 5)`.
- `BOOLEAN`: Maps to `BOOLEAN`.
- `DATE`: Maps to `TIMESTAMP WITH TIME ZONE`.

**Constraints:**
-   **Max Fields per Dataset:** 50 fields.


### 3. API Design (Resource Oriented)
We separate **Schema Operations** from **Data Operations** to prevent accidental table drops.

**Base:** `/bpm/master-data`

**Response Format (List):**
When querying records (`GET /:code/records`) or listing datasets (`GET /`), the response is wrapped in a pagination object:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

**Schema Operations:**
-   `POST /` : Create new Dataset (and physical table).
-   `GET /` : List all Datasets.
    -   **Pagination:** `?_page=1&_limit=10` (Default: page=1, limit=10).
-   `GET /:code` : Get Dataset Definition (Metadata).
-   `DELETE /:code` : Delete Dataset (Drop physical table).

**Data Operations:**
-   `POST /:code/records` : Insert a record (single object) or multiple records (array of objects).
-   `GET /:code/records` : Query records.
    -   **Filtering:** `?fieldName=value` (AND logic).
    -   **Projection:** `?_select=field1,field2` (Comma-separated list of fields to return).
    -   **Pagination:** `?_page=1&_limit=10` (Default: page=1, limit=10).
-   `PATCH /:code/records` : Bulk Update.
    -   **Query:** Params define "WHERE" clause.
    -   **Body:** Defines "SET" values.
-   `DELETE /:code/records` : Bulk Delete.
    -   **Query:** Params define "WHERE" clause.

### 4. Data Access Layer (Raw SQL)
We use `prisma.$queryRawUnsafe` with strict sanitization.

**Dynamic Query Construction:**
-   **Projection:** If `_select` is present, validate columns against schema and construct `SELECT "field1", "field2"`. Default is `SELECT *`.
-   **Filtering:** Validate keys in `filter` against schema and construct `WHERE "field1" = $1`.
-   **Pagination:**
    -   Calculate `OFFSET` = `(_page - 1) * _limit`.
    -   Add `LIMIT $limit OFFSET $offset` to the query.
    -   Execute a separate `SELECT COUNT(*)` query (with same filters) to get total count.

## Security & Sanitization (CRITICAL)
To prevent SQL Injection:
1.  **Identifier Validation:** Table and Column names must match `^[a-z][a-z0-9_]*$`.
2.  **Quoting:** All identifiers in generated SQL must be double-quoted.
3.  **Parameter Binding:** Values must ALWAYS use parameterized queries (e.g., `$1`, `$2`).

## Migration Strategy (Export/Import)
1.  **Export:** `exportDataset(code)` -> JSON with Definition + Records.
2.  **Import:** `importDataset(payload)` -> Check/Create/Upsert.

## Design Decisions

### Feature: Bulk Insert (POST /records with Array)

**Context:** The API initially supported only single record insertion. We extended it to support arrays for batch processing.

**Pros:**
*   **Performance:** Reduces network RTT (Round Trip Time) significantly when inserting many records (e.g., during migration or initial setup).
*   **Atomicity:** Allows wrapping the entire batch in a single database transaction, ensuring "all-or-nothing" consistency.
*   **Convenience:** Simplifies client-side logic for mass upload operations.

**Cons:**
*   **Error Handling Complexity:** Partial failures are harder to manage. If one record is invalid, the entire batch might fail (standard transactional behavior), forcing the client to fix and retry or split the batch.
*   **Payload Size Limits:** Large arrays might exceed the HTTP body size limit (e.g., 1MB or 10MB), requiring clients to implement chunking logic.
*   **Latency:** Processing a large batch takes longer, potentially leading to client timeouts if not managed asynchronously (though we aim for synchronous for simplicity in this MVP).
