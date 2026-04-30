Background

The current GET /users API endpoint returns all matching users in a single response. While server-side search (?search=) mitigates the issue for targeted queries, fetching all users without a search term can result in large payloads when the user base grows.

The frontend UserSelect component (used across approval nodes, form nodes, and other pickers) currently relies on this endpoint without any pagination constraint. A default limit was identified as a quick win, but proper pagination support is the sustainable long-term solution.

Goal

Add standard pagination parameters (page, limit) to the GET /users endpoint so that consumers can control the response size and implement efficient data loading strategies.

Acceptance Criteria

[ ] GET /users accepts optional query parameters: page (default: 1) and limit (default: 50)

[ ] Response includes pagination metadata: total, page, limit, totalPages

[ ] Existing search query parameter continues to work alongside pagination

[ ] When page and limit are omitted, the endpoint behaves with sensible defaults (does not break existing consumers)

[ ] API response envelope is consistent with other paginated endpoints in the system

Example Request / Response

Request:

GET /users?search=john&page=1&limit=20

Response:

{
  "success": true,
  "data": {
    "items": [...],
    "total": 87,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

Frontend Impact

Once the backend supports pagination, the frontend useUsers hook in src/hooks/useMasterData.ts and the domain-service.ts getUsers method will need to be updated to:

Pass page and limit to the API

Handle the new paginated response shape

Update UserSelect component if infinite scroll or load-more UX is desired