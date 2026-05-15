# API Documentation

This project should expose Swagger/OpenAPI documentation for the NestJS backend.

## Goals

- Provide a live API reference for reviewers and developers.
- Keep request/response models aligned with the shared TypeScript contracts.
- Document auth requirements, validation rules, and common error responses.

## Expected coverage

- Authentication endpoints
- Alert CRUD endpoints
- Health and readiness endpoints
- WebSocket-related backend contracts where applicable

## Documentation standards

- Use clear endpoint summaries and examples.
- Document required headers, query parameters, and body fields.
- Keep DTOs, enums, and validation rules in sync with the generated OpenAPI spec.

## Maintenance

- Update the API docs whenever routes or DTOs change.
- Re-generate Swagger output as part of backend changes.
- Keep examples minimal but realistic.
