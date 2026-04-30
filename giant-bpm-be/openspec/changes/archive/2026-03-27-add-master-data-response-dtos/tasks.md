## 1. DTO Implementation

- [x] 1.1 Create `src/master-data/dto/response/` directory
- [x] 1.2 Implement `DatasetDefinitionResponseDto` with `@ApiProperty` decorators
- [x] 1.3 Implement `PaginatedResponseDto<T>` base or similar pattern for reuse
- [x] 1.4 Implement `DatasetListResponseDto` using the paginated pattern
- [x] 1.5 Implement `DatasetRecordListResponseDto` for dynamic record queries
- [x] 1.6 Implement `DatasetExportResponseDto` combining definition and records
- [x] 1.7 Implement `DatasetImportResponseDto` for success/count results

## 2. Controller and OpenAPI Updates

- [x] 2.1 Update `MasterDataController.createDataset` with `@ApiResponse`
- [x] 2.2 Update `MasterDataController.listDatasets` with `@ApiResponse` (Paginated)
- [x] 2.3 Update `MasterDataController.getDataset` with `@ApiResponse`
- [x] 2.4 Update `MasterDataController.exportDataset` with `@ApiResponse`
- [x] 2.5 Update `MasterDataController.importDataset` with `@ApiResponse`
- [x] 2.6 Update `MasterDataController.createRecord` with `@ApiResponse`
- [x] 2.7 Update `MasterDataController.findRecords` with `@ApiResponse` (Paginated)

## 3. Verification

- [x] 3.1 Run `make openapi-doc` to regenerate the `openapi.yaml`
- [x] 3.2 Verify the new DTO structures in the generated `openapi.yaml`
- [x] 3.3 (Optional) Start the app and manually check Swagger UI at `http://localhost:3000/bpm/openapi`
- [x] 3.4 Run E2E tests to ensure Master Data API remains functional: `make test-local-e2e`
