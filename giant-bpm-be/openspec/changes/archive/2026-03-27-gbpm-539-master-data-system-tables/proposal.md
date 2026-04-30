# Proposal: Default System Tables for Users & Organizations

## Problem
Currently, the Master Data management API allows defining custom datasets and managing their records dynamically. However, external applications and frontend components often need to reference core system entities like Users and Organizations uniformly via the same Master Data interface. 

## Solution
We propose exposing native database tables (specifically `users` and `org_units`) as read-only system datasets. This means they can be queried via `GET /master-data/USERS/records` and `GET /master-data/ORG_UNITS/records` while safely blocking any mutating actions (POST, PATCH, DELETE) to protect data integrity and bypass of standard business logic.

## Capabilities
- **system-dataset-schema-discovery**: Provide read-only schema definitions for system-level entities (Users and OrgUnits) via the master data API.
- **system-dataset-record-retrieval**: Allow querying and listing records from native system tables using the master data query interface.
- **system-dataset-mutation-blocking**: Ensure system datasets are read-only through the master data API by blocking all write operations.