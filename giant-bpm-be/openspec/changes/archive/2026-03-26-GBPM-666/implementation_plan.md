# Goal Description
Implement a new API to query a master data dataset's code by its name (GBPM-666). Returning just the code is lightweight and sufficient, as the frontend or other services can use the retrieved code to access other existing master-data APIs.

## Proposed Changes
### src/master-data
- **`master-data-schema.service.ts`**: Add `async getDatasetCodeByName(name: string): Promise<{ code: string }>` method. This method will search `SYSTEM_DATASETS` first returning its code, and if not found, use Prisma to query `datasetDefinition.findFirst({ where: { name }, select: { code: true } })`. If not found, throw `NotFoundException`.
- **`master-data.controller.ts`**: Add `@Get('get-code/:name')` endpoint that calls `schemaService.getDatasetCodeByName(name)` and returns the JSON object `{ code: '...' }`. Add Swagger decorators `ApiOperation`, `ApiResponse` (with schema `{ type: 'object', properties: { code: { type: 'string' } } }`), and `ApiParam`.

### Testing & Specs
- **`openapi.yaml`**: Update OpenAPI doc using `make openapi-doc`.
- **`src/master-data/master-data-schema.service.spec.ts`**: Add unit tests for `getDatasetByName`.
- **`e2e_tester/tests/api/test_master_data.py`**: Add E2E tests for `GET /master-data/by-name/:name`.

## Verification Plan
### Automated Tests
- Run `npm run test -- master-data-schema.service.spec.ts` to ensure unit tests pass.
- Run the E2E test suite using docker `docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester`, specifically targeting test_master_data.py.
