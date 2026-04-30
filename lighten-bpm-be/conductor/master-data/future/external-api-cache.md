# GBPM-541: TTL Cache for External API Fetching (Future)

## Problem

Every paginated query on an external API dataset re-fetches the full response from the remote API. This causes unnecessary load on external services and slow response times for end users browsing records.

## Goal

Introduce a configurable TTL cache so repeated reads within a time window are served from cache instead of hitting the external API.

## Rough Approach

1. Add a `cache_ttl_seconds` field to `DatasetDefinition` (nullable, default `null` = no cache). Expose it in `CreateDatasetDto` and `UpdateExternalConfigDto`.
2. Use an in-memory cache (e.g., `@nestjs/cache-manager` or a simple `Map` with expiry) keyed by dataset code.
3. On `getRecords` for external API datasets:
   - Check cache for a non-expired entry — if found, apply in-memory query on cached data.
   - If miss, fetch from API, store result with TTL, then apply query.
4. Invalidate cache entry when `updateExternalConfig` is called (API config changed).
5. Consider a manual cache-bust endpoint (`POST /bpm/master-data/:code/refresh`) for admin use.

## Notes

- In-memory cache is sufficient for single-instance deployments. If the app scales horizontally, consider Redis.
- This is deferred — not included in the current GBPM-541 release.
