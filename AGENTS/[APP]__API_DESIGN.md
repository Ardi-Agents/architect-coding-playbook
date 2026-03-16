# Appendix: API Design Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.1 | **Updated**: 2026-01-22
> **Scope**: REST API design best practices

---

## Core Principles

### Backend-First Filtering
- All filtering logic on backend via query parameters
- API returns only requested, needed data
- Never rely on frontend to filter datasets

### Minimal Data Transfer
- Return only fields required by client
- Dropdown: return `{id, name}`, not full object

### Validate Parameters
- Validate all query parameters
- Invalid/unsupported → `400 Bad Request` with clear message

---

## Endpoint Naming

### Nouns for Resources, HTTP Methods for Actions

❌ **WRONG**:
```
POST /createUser
GET /getUserById/123
POST /deleteProduct
```

✅ **CORRECT**:
```
POST /users
GET /users/123
DELETE /products/456
```

### Clarity Over Brevity

❌ **WRONG**: `/api/v1/usr/tx/proc`
✅ **CORRECT**: `/api/v1/users/transactions/process`

❌ **WRONG**: `GET /data?t=1&s=a`
✅ **CORRECT**: `GET /transactions?type=refund&status=approved`

---

## Route Declaration Order

**Principle**: Declare specific/literal routes before dynamic routes.

```
✅ CORRECT order:
  /resource/stats        (literal)
  /resource/export       (literal)
  /resource/{id}         (dynamic - last)

❌ WRONG order:
  /resource/{id}         (consumes everything)
  /resource/stats        (never reached)
```

**Detection**: Literal endpoint returns 422 → check route order.

---

## Frontend-Backend Contract Validation

### Workflow
1. **Contract-First**: Define API schema in backend (source of truth)
2. **Mirror Types**: Create equivalent frontend interfaces
3. **Field-by-Field Audit**: Verify fields, optionality, enums match
4. **Test API Before UI**: Backend integration tests before frontend wiring

### Common Drift Patterns
- Backend adds optional param; frontend omits field
- Case mismatch (snake_case vs camelCase)
- Nested object added backend; frontend uses flat structure
- Enum values updated one side only

### Checkpoint Protocol
Before marking API complete:
1. Open backend schema + frontend type side-by-side
2. Verify every field (name, type, optionality)
3. Add cross-reference comments
4. 422/400 error → immediately check schema drift

---

## HTTP Status Codes

| Code | Use |
|------|-----|
| 200 OK | Successful GET, PUT, PATCH |
| 201 Created | Successful POST creating resource |
| 204 No Content | Successful DELETE |
| 400 Bad Request | Invalid client input |
| 401 Unauthorized | Authentication required |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Request conflicts with current state |
| 500 Internal Server Error | Server-side error |

---

## Error Response Format

### Structure
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Status 'PROCESING' is not valid",
    "details": "Allowed values: PENDING, PROCESSING, COMPLETED, FAILED",
    "field": "status"
  }
}
```

❌ **WRONG**: `{"error": "Bad request"}`
✅ **CORRECT**: `{"error": {"code": "MISSING_FIELD", "message": "Field 'email' is required", "field": "email"}}`

---

## Documentation Requirements

### Must Document
- All endpoints with request/response examples
- Authentication/authorization requirements
- Rate limiting policies
- Error response formats
- Query parameter options and defaults
- Pagination mechanisms

### Tools
- Use OpenAPI/Swagger for machine-readable specs
- Keep docs in sync with code
- Generate from code where possible (FastAPI auto-docs)

---

## Consistency Checklist

- [ ] All timestamps in ISO 8601 format
- [ ] All IDs as integers OR UUIDs (not mixed)
- [ ] All field names in snake_case OR camelCase (not mixed)
- [ ] All list endpoints support pagination
- [ ] All error responses use same structure
- [ ] All date filters use same parameter names
