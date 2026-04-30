## ADDED Requirements

### Requirement: Document Master Data Dataset Definition Responses
The system SHALL provide detailed OpenAPI documentation for all endpoints that return dataset definitions. This documentation MUST include the internal ID, public UUID, code, display name, and the JSON-structured fields of the dataset.

#### Scenario: Viewing a single dataset definition
- **WHEN** a user navigates to the Swagger UI at `/bpm/openapi` and expands the GET `/master-data/{code}` endpoint
- **THEN** the system displays a `DatasetDefinitionResponseDto` model containing `id`, `public_id`, `code`, `name`, `fields`, `created_at`, and `updated_at`

### Requirement: Document Master Data Dataset List Responses
The system SHALL provide detailed OpenAPI documentation for the paginated list of datasets. This documentation MUST include the list of dataset items and the associated pagination metadata (total, page, limit, totalPages).

#### Scenario: Viewing the list of datasets
- **WHEN** a user views the Swagger UI for GET `/master-data`
- **THEN** the system displays a `DatasetListResponseDto` model containing an array of `items` (DatasetDefinitionResponseDto) and pagination metadata fields

### Requirement: Document Master Data Record Query Responses
The system SHALL provide detailed OpenAPI documentation for paginated record query results. Since records are dynamic, the documentation MUST represent the items as a collection of JSON objects while explicitly documenting the pagination metadata.

#### Scenario: Querying dataset records
- **WHEN** a user views the Swagger UI for GET `/master-data/{code}/records`
- **THEN** the system displays a `DatasetRecordListResponseDto` model containing an array of `items` (generic JSON objects) and pagination metadata

### Requirement: Document Master Data Export Responses
The system SHALL provide detailed OpenAPI documentation for the export endpoint. This documentation MUST reflect a response structure that combines the dataset definition and its associated records.

#### Scenario: Viewing the export response structure
- **WHEN** a user views the Swagger UI for GET `/master-data/{code}/export`
- **THEN** the system displays a `DatasetExportResponseDto` model containing a `definition` object and a `records` array

### Requirement: Document Master Data Import Responses
The system SHALL provide detailed OpenAPI documentation for the import endpoint's success result.

#### Scenario: Viewing the import result
- **WHEN** a user views the Swagger UI for POST `/master-data/import`
- **THEN** the system displays a `DatasetImportResponseDto` model containing `success: boolean` and `count: number`
