## Why

The current implementation of the Master Data Management module lacks explicit response DTOs for its API endpoints. This results in poor OpenAPI (Swagger) documentation, as the structure of response objects (e.g., dataset definitions, records, and pagination metadata) is not visible to API consumers. Adding these DTOs will improve developer experience, type safety, and the overall quality of the API contract.

## What Changes

- **New Response DTOs**: Create specialized DTOs for all Master Data API responses.
  - `DatasetDefinitionResponseDto`: For single dataset details.
  - `DatasetListResponseDto`: For paginated list of datasets.
  - `DatasetRecordResponseDto`: For single/multiple data record operations.
  - `DatasetRecordListResponseDto`: For paginated query results.
  - `DatasetExportResponseDto`: For export operations combining definition and records.
  - `DatasetImportResponseDto`: For import operation results.
- **Controller Updates**: Update `MasterDataController` to use `@ApiResponse` decorators and specify the new DTO types in `@ApiOperation`.
- **OpenAPI Enhancement**: Ensure the generated `openapi.yaml` accurately reflects the new response structures.

## Capabilities

### New Capabilities
- `master-data-api-documentation`: Establish a standardized way to document Master Data responses using NestJS Swagger decorators and DTOs.

### Modified Capabilities
- (None)

## Impact

- **Affected Code**: `MasterDataController`, `MasterDataSchemaService`, `MasterDataRecordService`.
- **APIs**: All endpoints under `/bpm/master-data`.
- **Dependencies**: No new external dependencies; utilizes existing `@nestjs/swagger`.
