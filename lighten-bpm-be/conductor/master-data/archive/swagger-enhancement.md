# Objective
Enhance the OpenAPI documentation for `MasterDataController` by adding `ApiBody`, `ApiQuery`, and appropriate DTOs where needed.

# Key Files & Context
- `src/master-data/master-data.controller.ts`: The controller where decorators should be added.
- `src/master-data/dto/import-dataset.dto.ts`: New DTO for the import operation.
- `src/master-data/dto/record-operations.dto.ts`: Potentially new DTOs for record operations.

# Proposed Changes

1.  **Create `ImportDatasetDto`**:
    To provide better documentation for the `importDataset` endpoint.

    ```typescript
    import { ApiProperty } from '@nestjs/swagger';
    import { CreateDatasetDto } from './create-dataset.dto';

    export class ImportDatasetDto {
      @ApiProperty({ type: CreateDatasetDto })
      definition: CreateDatasetDto;

      @ApiProperty({
        type: 'object',
        isArray: true,
        example: [{ vendor_name: 'Vendor A', score: 100 }],
      })
      records: Record<string, unknown>[];
    }
    ```

2.  **Update `MasterDataController`**:
    - Add `ApiBody` for `createRecord`, `updateRecords`, and `importDataset`.
    - Enhance `ApiQuery` descriptions to explain how dynamic filters work (e.g., any field name can be used as a filter).
    - Use the new `ImportDatasetDto`.

    Specific decorator additions:
    - **`importDataset`**: `@ApiBody({ type: ImportDatasetDto })`
    - **`createRecord`**: `@ApiBody({ schema: { oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'object' } }] }, description: 'A single record or an array of records' })`
    - **`updateRecords`**: 
        - `@ApiQuery({ name: 'filter', type: 'object', description: 'Filter criteria (e.g., field_name=value)', required: true })`
        - `@ApiBody({ type: 'object', description: 'Fields to update' })`
    - **`deleteRecords`**: `@ApiQuery({ name: 'filter', type: 'object', description: 'Filter criteria (e.g., field_name=value)', required: true })`

# Implementation Plan

1.  **Create `src/master-data/dto/import-dataset.dto.ts`**.
2.  **Modify `src/master-data/master-data.controller.ts`** to apply the decorators.

# Verification
1.  Run `make openapi-doc` to regenerate the `openapi.yaml`.
2.  Check the generated `openapi.yaml` or view it in Swagger UI to ensure the changes are reflected.
