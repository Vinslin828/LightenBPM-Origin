# Issue Ticket: GBPM-776

# Description
[Pre-conditions]

On 'Operation Home'.

An External API type Master Data table exists (e.g., External_vendor_3)

The table already has at least one column mapping configured

[How to reproduce the problem]

Log in to the GIANT BPM platform with admin account.

Navigate to Master Data > select an External API type table (e.g., "External_vendor_3")

Click "API Config" button to open the Update API Config dialog

Click "+ Add mapping" to add a new column mapping

Enter Dataset field name (e.g., "e_vendor_name") and JSON path (e.g., "vendor_name")

Click "Save" button

Observe the table view after saving

[Actual Result]

The save operation shows success message (green "Save" toast notification)

However, the table view does not display the newly added column

Only the original column (e_vendor_id) is visible

The new column (e_vendor_name) is missing from the table

[Expected Result]
After successfully saving the API Config with a new column mapping, the table view should:

Display all configured columns including the newly added column

Show the new column (e_vendor_name) with its corresponding data from the API response

# NOTE
It seems related to update master data schema implementation. We need to check following first:
1. How we handle the master data update (add, remove columns) for External API or Datasets? I expected that we didn't handle all cases properly.
2. Besides, analyze the data record database migration risks
