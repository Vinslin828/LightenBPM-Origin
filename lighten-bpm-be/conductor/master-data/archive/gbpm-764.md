# Issue Ticket: GBPM-764

# Description
[Pre-conditions]

On 'Operation Home'.

A table exists in Master Data with columns that have default values configured (e.g. a boolean column with default value "false", or a text column with a specific default value).

[How to reproduce the problem]

Navigate to Master Data from the left sidebar.

Open an existing table or create a new table.

Configure columns with default values (e.g. set a boolean column's default value to "false", a text column's default value to a specific string).

Save the table/column configuration.

Click "+ Add new row" to add a new row.

Observe the newly added row's field values.

[Actual Result]
The newly added row does NOT have the configured default values applied. The fields appear empty or show placeholder text instead of the expected default values. Users must manually enter values that should have been pre-filled.

[Expected Result]
When a new row is added, all columns that have default values configured should automatically pre-fill those default values into the corresponding cells of the new row. For example, a boolean column with default "false" should show "False" toggle, a text column with a default string should display that string.

# NOTE
I think it's default value handling of master-data apis. We need to review the implementation about the master data definitions schema.
- Does the api handle the default value?
- Does the DTO has related structure?