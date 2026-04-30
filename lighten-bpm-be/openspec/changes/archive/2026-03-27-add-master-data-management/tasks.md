# Implementation Tasks

1.  **Database Layer (Meta-Data)**
    -   [x] Define `DatasetDefinition` in `prisma/schema.prisma` (Fields: code, table_name, fields, created_by, updated_by).
    -   [x] Create and run migration: `make migrate-dev name=add_master_data_meta`.

2.  **Module Setup**
    -   [x] Create `src/master-data` module.
    -   [x] Implement `MasterDataUtils` for identifier validation.

3.  **Schema Management (DDL)**
    -   [x] Implement `MasterDataSchemaService`.
    -   [x] `createDataset(dto, userCode)`: Create Definition + `CREATE TABLE`.
    -   [x] `deleteDataset(code)`: Drop Table + Delete Definition.
    -   [x] `getDataset(code)`: Find Definition.
    -   [x] `getDatasets(page, limit)`: List Definitions with pagination.

4.  **Record Management (DML)**
    -   [x] Implement `MasterDataRecordService`.
    -   [x] `createRecord(code, data)`: Insert SQL.
    -   [x] `findRecords(code, filter, select, page, limit)`:
        -   [x] Validate `select` array against schema.
        -   [x] Construct `SELECT col1, col2` vs `SELECT *`.
        -   [x] Construct `WHERE` clause.
        -   [x] Construct `LIMIT` and `OFFSET`.
        -   [x] Execute count query for metadata.
    -   [x] `updateRecords(code, filter, data)`: Update SQL with `WHERE` clause.
    -   [x] `deleteRecords(code, filter)`: Delete SQL with `WHERE` clause.
    -   [x] Update `createRecord` to handle array input (Bulk Insert).

5.  **Migration Integration**
    -   [x] `exportDataset(code)`: Return Definition + Records JSON.
    -   [x] `importDataset(payload)`: Check existence -> Create/Upsert Definition -> Upsert Records.

6.  **API Layer**
    -   [x] `MasterDataController` (Datasets & Records endpoints).
    -   [x] Bind `_select` query param to `select` array.
    -   [x] Bind `_page` and `_limit` query params to `page` and `limit`.
    -   [x] Bind other query params to `filter` object.

7.  **Testing**
    -   [x] Unit tests for SQL generation (SELECT clause & WHERE clause).
    -   [x] Unit tests for pagination SQL (LIMIT/OFFSET).
    -   [x] E2E tests:
        -   [x] Create Dataset.
        -   [x] Insert records.
        -   [x] Query with `_select` (expect partial object).
        -   [x] Query with filter.
        -   [x] Query with pagination.

8.  **Restrictions & Validations (New)**
    -   [x] Remove `maxLength`, `precision`, `scale` options from `DatasetFieldDto`.
    -   [x] Validate: max 50 fields per dataset.
    -   [x] Update `MasterDataSchemaService.createDataset` to use fixed `VARCHAR(2000)` and `DECIMAL(20, 5)`.
    -   [x] Update tests for fixed SQL generation.