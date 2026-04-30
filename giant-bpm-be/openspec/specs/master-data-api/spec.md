# master-data-api Specification

## Purpose
TBD - created by archiving change add-master-data-management. Update Purpose after archive.
## Requirements
### Requirement: Define Dataset Schema
The system MUST allow administrators to define new Datasets via `POST /bpm/master-data/datasets`.

#### Scenario: Create a new Dataset
Given I am an authenticated admin
When I POST to `/bpm/master-data/datasets` with:
```json
{
  "code": "VENDORS",
  "name": "Vendor List",
  "fields": [
    { "name": "vendor_name", "type": "TEXT", "required": true },
    { "name": "region", "type": "TEXT", "required": false },
    { "name": "rating", "type": "NUMBER", "required": false }
  ]
}
```
Then I should receive a 201 Created response
And a table named `md_vendors` should be created.

#### Scenario: List Datasets (Pagination)
Given 12 datasets exist
When I GET `/bpm/master-data/datasets?_page=2&_limit=5`
Then I should receive 5 datasets
And the response metadata should show total=12, page=2, limit=5.

### Requirement: Manage Dataset Records
The system MUST allow CRUD operations via `/bpm/master-data/datasets/:code/records`.

#### Scenario: Insert Record (Single)
Given a dataset "VENDORS" exists
When I POST to `/bpm/master-data/datasets/VENDORS/records` with:
```json
{ "vendor_name": "Acme Corp", "region": "North", "rating": 5 }
```
Then I should receive a 201 Created response.

#### Scenario: Insert Records (Bulk)
Given a dataset "VENDORS" exists
When I POST to `/bpm/master-data/datasets/VENDORS/records` with:
```json
[
  { "vendor_name": "Acme Corp", "region": "North", "rating": 5 },
  { "vendor_name": "Beta Inc", "region": "South", "rating": 4 }
]
```
Then I should receive a 201 Created response
And 2 records should be created.

#### Scenario: Query Records (Filter)
Given records exist: "Acme/North", "Beta/South", "Gamma/North"
When I GET `/bpm/master-data/datasets/VENDORS/records?region=North`
Then I should receive 2 records ("Acme", "Gamma").

#### Scenario: Query Records (Select Fields)
Given records exist: "Acme/North/5"
When I GET `/bpm/master-data/datasets/VENDORS/records?_select=vendor_name,rating`
Then I should receive records containing ONLY "vendor_name" and "rating"
And "region" should be undefined/missing in the response.

#### Scenario: Query Records (Pagination)
Given 15 records exist in "VENDORS"
When I GET `/bpm/master-data/datasets/VENDORS/records?_page=2&_limit=10`
Then I should receive 5 records
And the response metadata should show total=15, page=2, limit=10.

#### Scenario: Bulk Update Records
Given records exist: "Acme/North", "Gamma/North"
When I PATCH `/bpm/master-data/datasets/VENDORS/records?region=North` with:
```json
{ "region": "North-East" }
```
Then I should receive a 200 OK response
And the 2 records should now have region "North-East".

#### Scenario: Bulk Delete Records
Given records exist: "Acme/North-East", "Beta/South"
When I DELETE `/bpm/master-data/datasets/VENDORS/records?region=South`
Then "Beta" should be deleted
And "Acme" should remain.

