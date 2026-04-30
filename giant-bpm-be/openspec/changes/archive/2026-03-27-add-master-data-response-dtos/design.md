## Context

The `master-data` module provides APIs for managing dynamic datasets and their records. While the core functionality is implemented, the API responses currently return raw database objects or generic `Record<string, unknown>` types. This lacks explicit documentation in the OpenAPI (Swagger) specification, making it difficult for frontend developers and other consumers to understand the expected response structure.

## Goals / Non-Goals

**Goals:**
- Define explicit DTO classes for all Master Data API responses.
- Decorate these DTOs with `@ApiProperty` to ensure they appear in the Swagger UI.
- Update `MasterDataController` to use these DTOs for response typing and documentation.
- Maintain consistency with existing pagination patterns used in other modules.

**Non-Goals:**
- Changing the underlying business logic or database schema.
- Implementing complex validation for response data (focus is on documentation and typing).
- Refactoring the entire `master-data` module.

## Decisions

### 1. DTO Location and Naming
All new response DTOs will be placed in `src/master-data/dto/response/` to separate them from request DTOs.
- **Rationale**: Better organization and easier discovery of response-related types.

### 2. Pagination Metadata Reuse
We will create a common `PaginatedResponseDto<T>` or similar pattern to handle pagination metadata (`total`, `page`, `limit`, `totalPages`) consistently.
- **Rationale**: Reduces duplication and ensures a uniform API response format across the application.

### 3. Dynamic Record Documentation
For dataset records, which have dynamic structures, we will use `@ApiProperty({ type: 'object', additionalProperties: true })` or similar to represent them as generic JSON objects while still documenting the surrounding metadata.
- **Rationale**: Reflects the dynamic nature of master data while providing a typed container for the response.

### 4. Controller Decoration
We will use `@ApiOperation({ response: ... })` and `@ApiResponse({ type: ... })` decorators in the controller.
- **Rationale**: NestJS Swagger uses these to generate the OpenAPI schema.

## Risks / Trade-offs

- **[Risk] Maintenance Overhead** → Any changes to the service return types must be manually reflected in the response DTOs.
  - **Mitigation**: Use `PickType` or similar NestJS mapped types if we eventually share common properties with base entities, but for now, simple DTOs are clearer.
- **[Trade-off] Explicit vs. Implicit** → Explicit DTOs require more code but provide significantly better documentation and type safety compared to raw Prisma types.
