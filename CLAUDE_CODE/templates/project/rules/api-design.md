# API Design — [PROJECT_NAME]

> **Location:** `.claude/rules/api-design.md`
> **Scope:** API patterns for this project
> **Source of truth:** [`@AGENTS/[APP]__API_DESIGN.md`](../../AGENTS/%5BAPP%5D__API_DESIGN.md)

---

## API Style

- **Protocol:** [REST / GraphQL / gRPC]
- **Format:** [JSON / Protocol Buffers]
- **Versioning:** [URI versioning `/v1/` / header versioning / no versioning yet]
- **Authentication:** [OAuth 2.0 / JWT / Session cookies / API key]

## Endpoint Conventions

### Resource Naming

- Use **plural nouns** for collections: `/users`, `/orders`
- Use **IDs** for individual resources: `/users/{id}`
- Nest sparingly: `/users/{id}/orders` is OK; deeper nesting usually isn't.

### HTTP Methods

| Method | Use |
|---|---|
| `GET` | Retrieve a resource or collection (idempotent, safe) |
| `POST` | Create a new resource |
| `PUT` | Replace a resource (idempotent) |
| `PATCH` | Partially update a resource |
| `DELETE` | Remove a resource (idempotent) |

### Status Codes

| Code | Use |
|---|---|
| `200 OK` | Successful read or update |
| `201 Created` | Successful create — return the new resource |
| `204 No Content` | Successful delete or empty response |
| `400 Bad Request` | Validation error (return field-level errors) |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorized |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | State conflict (duplicate key, version mismatch) |
| `422 Unprocessable Entity` | Validation passed but business rule failed |
| `500 Internal Server Error` | Unhandled server error (alert + log) |

> Full status code rules: see [`@AGENTS/[APP]__API_DESIGN.md`](../../AGENTS/%5BAPP%5D__API_DESIGN.md).

## Error Format

Standard error response shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable message",
    "fields": [
      { "field": "email", "message": "Must be a valid email address" }
    ],
    "request_id": "req_abc123"
  }
}
```

## Timestamps

- All timestamps in **UTC with trailing `Z`**: `2026-01-22T15:30:00Z`
- Tests must assert this exact format.
- See AGENTS.md UTC timestamp contract.

## Pagination

- **Cursor-based** for high-volume collections: `?cursor=abc&limit=50`
- **Offset-based** acceptable for small, bounded collections: `?page=1&per_page=50`
- Always include `next_cursor` or `total_pages` in the response envelope.

---

> Edit to match this project's actual API conventions. Delete sections that don't apply.
