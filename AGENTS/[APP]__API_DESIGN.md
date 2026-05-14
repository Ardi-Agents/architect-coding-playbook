# Appendix: API Design Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: REST API design rules (HTTP semantics, naming, status codes), error-format conventions per track, frontend-backend contract validation, optional authentication patterns per track.
>
> **Fires when**: designing an endpoint, "how should the API respond?", "what status code?", reviewing error formats, "how is auth wired here?".
>
> **Length note**: 304 lines — marginally over the advisory 300-line cap defined in `AGENTS.md` § File-Length Guideline. Justification: per-track error-format recipes (5 tracks × error envelope + status-code conventions) plus an optional cross-track Authentication section. Clarity-wins exception per kernel rule.

---

## Core Principles (cross-track)

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

## Endpoint Naming (cross-track)

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

## Route Declaration Order (cross-track)

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

This issue manifests differently across frameworks but the fix is universal: declare specific before dynamic. Frameworks affected include ASP.NET Core minimal APIs, FastAPI, Express, Gin, Axum/actix.

---

## Frontend-Backend Contract Validation (cross-track)

### Workflow

1. **Contract-First**: Define API schema in backend (source of truth)
2. **Mirror Types**: Create equivalent frontend types (or generate them)
3. **Field-by-Field Audit**: Verify fields, optionality, enums match
4. **Test API Before UI**: Backend integration tests before frontend wiring

### Common Drift Patterns

- Backend adds optional param; frontend omits field
- Case mismatch (snake_case vs camelCase)
- Nested object added backend; frontend uses flat structure
- Enum values updated one side only

### Type Generation (preferred over manual mirroring)

- **dotnet → typescript**: NSwag, Kiota, or `swagger-typescript-api` from OpenAPI emitted by ASP.NET Core.
- **python → typescript**: `datamodel-code-generator` or `openapi-typescript` from FastAPI's auto-generated OpenAPI.
- **rust → typescript**: `ts-rs` crate or `specta` to emit TS types from Rust structs.
- **go → typescript**: `tygo` for Go-to-TS struct generation.

### Checkpoint Protocol

Before marking API complete:

1. Open backend schema + frontend type side-by-side (or run the codegen and review the diff)
2. Verify every field (name, type, optionality)
3. Add cross-reference comments where types are manually mirrored
4. 422/400 error → immediately check schema drift

---

## HTTP Status Codes (cross-track)

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
| 422 Unprocessable Entity | Semantically invalid (passed parsing, failed validation) |
| 429 Too Many Requests | Rate limited |
| 500 Internal Server Error | Server-side error |

---

## Error Response Format

### Cross-track shape

Errors return a structured object — not a bare string — with at minimum:

- A stable machine-readable code
- A human-readable message
- Optional details and field-level breakdown

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

The shape is enforced consistently across endpoints. Per-track conventions for *producing* this shape:

#### Track: dotnet

> **Depth**: expert.

- Use **`ProblemDetails` (RFC 7807)** for error responses — the ASP.NET Core convention.
- Built-in support: `app.UseExceptionHandler()` + `services.AddProblemDetails()` (or the `IProblemDetailsService` API).
- Custom error codes: extend `ProblemDetails` via `Extensions["code"] = "INVALID_STATUS"`; or define a derived type with strongly-typed extra fields.
- For validation errors, ASP.NET Core emits `ValidationProblemDetails` automatically when `[ApiController]` is used and model state is invalid.
- `Type` field SHOULD be a stable URI (RFC 7807 §3.1) — e.g., `https://yourdomain.example/errors/invalid-status`.

#### Track: python

> **Depth**: expert.

- **FastAPI**: raise `HTTPException(status_code=400, detail={"code": "INVALID_STATUS", "message": "...", "field": "status"})`. FastAPI serializes `detail` as the response body's `detail` field.
- **For consistent shape**: define an `APIError(BaseModel)` with `code`, `message`, `details`, `field`, and a custom exception handler that wraps `HTTPException` to emit `{"error": <APIError>}`.
- **Django REST Framework**: subclass `APIException`; override `default_code` and `default_detail`; return structured payload via custom exception handler.
- Validation errors: pydantic emits structured field-level errors automatically; map them to your wire shape in a global exception handler.

#### Track: typescript

> **Depth**: expert.

- **Express**: error-handling middleware (`(err, req, res, next) => res.status(...).json({error: {...}})`). Define a `ApiError` class and a centralized handler.
- **Hono / Fastify**: similar pattern with the framework's error hook (`app.onError(...)`).
- **NestJS**: throw `HttpException` subclasses (`BadRequestException`, `NotFoundException`); register a global `ExceptionFilter` for shape consistency.
- Validation: `zod` / `valibot` schemas at boundaries; map their `ZodError` / `ValiError` to your wire shape.

#### Track: go

> **Depth**: consensus.

- Define an `APIError` struct with `Code`, `Message`, `Details`, `Field` fields plus a `Status int` for HTTP status mapping.
- Centralized middleware (`func(next http.Handler) http.Handler`) catches errors via `errors.As(err, &APIError)` and writes the JSON response.
- For Gin: use `gin.Context.AbortWithStatusJSON(...)`; for Echo: `echo.HTTPError`; for chi: custom error renderer.
- Wrap errors with context using `fmt.Errorf("operation: %w", err)` so the centralized handler can unwrap and classify.

#### Track: rust

> **Depth**: consensus.

- Define an `ApiError` enum (with `thiserror`) where each variant maps to a status code and error code.
- Implement `IntoResponse` (axum) / `Responder` (actix-web) to convert the enum to a structured JSON response.
- For validation: `validator` crate or hand-rolled validators that return your `ApiError::Validation { … }` variant.
- Wrap errors with context using `?` and `map_err`; library code uses `thiserror`, binary code uses `anyhow` plus a final mapping at the handler boundary.

---

## Authentication (if present)

> **Conditional appendix section.** If your project has no authentication, skip this section entirely. The kernel's P0 rule "Never modify auth without explicit approval" applies only when auth is present.

### Cross-track principles

- **Token-based by default**: JWTs, opaque session tokens, or OAuth-issued bearer tokens. Cookies optional (and require CSRF protection if used).
- **Auth on every protected route** — never rely on the frontend to enforce.
- **Validate token on every request** — never cache "this user is logged in" without re-checking expiration / revocation.
- **Authorize separately from authenticate** — being logged in is not the same as having permission. Use a permission / role / policy layer downstream of authentication.
- **Test auth as part of the regular test suite**, not as an afterthought (per `[APP]__IMPLEMENTATION.md` § Authentication System Protection).

### Per-track patterns

#### Track: dotnet

> **Depth**: expert.

- **JWT bearer**: `services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(opts => { ... })`; `[Authorize]` on controllers/actions.
- **ASP.NET Core Identity** for first-party user management with hashing, lockout, 2FA out of the box.
- **OpenIddict** or **Duende IdentityServer** for OAuth/OIDC server.
- **Authorization policies**: `services.AddAuthorization(opts => opts.AddPolicy("CanEditOrders", policy => policy.RequireRole("Admin")))`; apply with `[Authorize(Policy = "CanEditOrders")]`.
- **Test auth flows** with `WebApplicationFactory<TStartup>` for integration; mint test tokens via the same JWT signer.

#### Track: python

> **Depth**: expert.

- **FastAPI**: `fastapi.security.OAuth2PasswordBearer` for token extraction; `Depends(get_current_user)` for per-route auth check.
- **`python-jose` or `authlib`** for JWT decode/encode and signature verification.
- **`passlib`** for password hashing (bcrypt or argon2).
- **Permission layer**: separate `Depends(require_permission("orders:edit"))` from `Depends(get_current_user)`.
- **Django**: built-in auth middleware; `django-rest-framework-simplejwt` for JWT.
- **Testing**: `TestClient` with auth headers; mint test tokens with the same secret.

#### Track: typescript

> **Depth**: expert.

- **Hosted IDPs**: Clerk, Auth0, Okta, AWS Cognito, NextAuth (now Auth.js) for first-party Next.js — handle the hard parts (session management, SSO, MFA).
- **Self-hosted JWT**: `jose` or `jsonwebtoken` for signing/verifying; middleware that extracts and verifies the bearer token.
- **NextAuth/Auth.js**: declarative provider config; `auth()` helper for server components / API routes.
- **Express**: `passport` with strategy of choice (local, JWT, OAuth providers).
- **Testing**: mock the auth provider in unit tests; use real provider in integration tests with a dedicated test tenant.

#### Track: go

> **Depth**: consensus.

- **JWT**: `golang-jwt/jwt` for token operations; middleware function (`func(next http.Handler) http.Handler`) extracts and validates.
- **OAuth2**: `golang.org/x/oauth2` for client; `ory/hydra` or `dexidp/dex` for self-hosted server.
- **Authorization**: `casbin` for policy-based access control; or hand-rolled with role-checks in middleware.
- **Context-based propagation**: store the authenticated user in `context.Context` via a typed key, retrieve in handlers.

#### Track: rust

> **Depth**: consensus.

- **JWT**: `jsonwebtoken` crate for sign/verify; tower middleware (`tower::layer::Layer`) for axum / actix-web.
- **OAuth2**: `oauth2` crate for client.
- **Authorization**: extractor pattern in axum (`async fn handler(user: AuthenticatedUser, ...)`); `FromRequestParts` impl for `AuthenticatedUser` does the JWT parsing.
- **Argon2 for password hashing**: `argon2` crate.

---

## Documentation Requirements (cross-track)

### Must Document

- All endpoints with request/response examples
- Authentication/authorization requirements (if auth present)
- Rate limiting policies
- Error response formats (link to the cross-track shape above)
- Query parameter options and defaults
- Pagination mechanisms

### Tools

- Use OpenAPI/Swagger for machine-readable specs
- Keep docs in sync with code
- Generate from code where possible:
  - `dotnet`: `Microsoft.AspNetCore.OpenApi` + `Swashbuckle` or `NSwag`
  - `python`: FastAPI auto-docs at `/docs` and `/redoc`; DRF + `drf-spectacular`
  - `typescript`: NestJS Swagger module; `tsoa` for TS-from-decorators; `zod-openapi` for zod-based handlers
  - `go`: `swag` for swaggo, `huma` framework with built-in OpenAPI
  - `rust`: `utoipa` for axum/actix, `aide` for axum

---

## Consistency Checklist (cross-track)

- [ ] All timestamps in ISO 8601 format with trailing `Z` (per kernel UTC contract)
- [ ] All IDs as integers OR UUIDs (not mixed)
- [ ] All field names in snake_case OR camelCase (not mixed)
- [ ] All list endpoints support pagination
- [ ] All error responses use the same structure
- [ ] All date filters use the same parameter names
- [ ] If auth is present: all protected routes verified via test suite
- [ ] Frontend types match backend schemas (codegen preferred over manual mirroring)
