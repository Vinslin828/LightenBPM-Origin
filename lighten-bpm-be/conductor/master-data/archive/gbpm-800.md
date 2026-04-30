# Feature Ticket: GBPM-800
This ticket was discussing the scenario how master data records handling when schema updated (add, remove or rename the columns). For backend development, we need to focus on the DB Table scenario. And the import/export requirement may be treated as future plan.

# Description
Background / Context

The Master Data module currently allows users to create data tables. The customer wants to support schema maintenance after table creation, including adding, editing, and deleting fields, as well as changing data types. 

We have clarified that supporting this in a true incremental way would effectively require a database editor. 

As a compromise, schema changes after table creation will be handled by dropping and recreating the underlying table instead of altering the existing table structure. 

Because this approach will remove existing data, the system must clearly warn users before the change is applied. 

This requirement is also related to the CSV export and import feature, so users can export data before schema changes and import data again afterward if needed.

Functional Specification

Post-creation schema maintenance

The system must allow users to modify Master Data table schema after table creation

Supported schema changes must include adding fields, editing existing fields, deleting fields, and changing field data types

These operations apply to the table structure definition managed in Master Data

Table rebuild behavior

Any supported schema change after table creation must be handled by dropping the existing underlying table and recreating a new table with the updated schema

The system must not perform in-place database schema alteration for this feature

All existing data in the original table must be deleted as part of the rebuild process

The recreated table must follow the latest field definitions configured by the user

User warning and confirmation

Before applying any schema change that triggers table rebuild, the system must display a clear warning that all existing data will be deleted

The warning must inform users that the action is destructive and cannot preserve current table data

The user must explicitly confirm the action before the system proceeds with the rebuild

If the user does not confirm, the system must cancel the schema change and keep the existing table and data unchanged

Acceptance Criteria

AC-1 Add or edit field triggers rebuild warning

GIVEN a user updates a Master Data table schema by adding a field, editing a field, deleting a field, or changing a data type

WHEN the user attempts to save the schema change

THEN the system displays a warning that the table will be rebuilt and all existing data will be deleted

AC-2 Confirm destructive schema change

GIVEN a user has received the rebuild warning for a schema change

WHEN the user explicitly confirms the action

THEN the system drops the existing table, recreates it with the updated schema, and removes all previous data

AC-3 Cancel destructive schema change

GIVEN a user has received the rebuild warning for a schema change

WHEN the user cancels the action or does not confirm

THEN the system does not apply the schema change and keeps the existing table and data unchanged

AC-4 Recreated table follows latest schema

GIVEN a user confirms a schema change for a Master Data table

WHEN the rebuild process is completed

THEN the new table structure matches the latest saved field definitions including added, modified, deleted fields, and updated data types

Out of Scope

In-place database schema editing or migration without table rebuild

Automatic data migration from old schema to new schema

Preservation of existing data during field or data type changes

Automatic re-import of exported data after table rebuild

# NOTES
For the update table implemenation, the idea is to do a hard reset when schema updated to avoid db migration risks. Therefore, we need to focus on:
1. Any concern or risks?
2. How to proper handle the request
In the future, we need to support import/export for the datas to replace the data migration mechanism for user. This part already has another tickets.