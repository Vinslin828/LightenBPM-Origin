# Proposal: Add Master Data Management (Physical Tables)

## Problem
The system currently supports built-in master data entities like Users and Organization Units. However, business processes often require referencing other types of structured data (e.g., "Cost Centers", "Product Categories", "Vendor Lists") that don't warrant hard-coded tables in the main schema.

## Solution
Introduce a **Master Data Management (MDM)** module using **Dynamic Physical Tables**. This allows:
1.  **Schema Definition:** Administrators define a dataset (e.g., "Vendors") and its columns (Name, Tax ID, Region) via API.
2.  **Physical Storage:** The system automatically executes DDL (`CREATE TABLE`) to create a dedicated table (e.g., `md_vendors`) in the database.
3.  **Data Management:** APIs allow CRUD operations on these tables using generated SQL.

## Scope
-   **New Domain:** `MasterData`.
-   **Meta-Entity:** `DatasetDefinition` (Stores metadata about the dynamic tables).
-   **Dynamic Tables:** Tables prefixed with `md_` created at runtime.
-   **API:**
    -   Schema Management (Create/Update Datasets -> Executes DDL).
    -   Record Management (CRUD -> Executes DML).
    -   Bulk Insert Support (POST array of records).
-   **Supported Types:** Text, Number, Boolean, Date.
-   **Restrictions (System Fixed):**
    -   Text fields: `VARCHAR(2000)`.
    -   Number fields: `DECIMAL(20, 5)`.
    -   Dataset limit: Max 50 fields.
-   **Migration:** Support Export/Import of Datasets and Records.

## Out of Scope
-   Foreign Keys between dynamic tables (MVP).
-   Complex Index management (primary keys only for MVP).
