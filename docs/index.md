# Documentation Index

Use this page as the entry point for all project documentation.

## Getting Started

**New to the project?** Start here:

1. **[README.md](../README.md)** — project overview, quick start, and architecture summary
2. **[docs/setup.md](./setup.md)** — environment setup, local development, deployment workflows
3. **[docs/architecture.md](./architecture.md)** — system design, reliability patterns, and observability

## Implementation & Planning

- **[PRD.md](../PRD.md)** — product requirements and feature scope
- **[plan.md](../plan.md)** — top-level implementation roadmap and progress tracking
- **[AGENTS.md](../AGENTS.md)** — conductor workflow and contributing conventions
- **[conductor/product.md](../conductor/product.md)** — conductor product summary
- **[conductor/tracks/](../conductor/tracks/)** — detailed per-track plans and specifications
- **[conductor/tech-stack.md](../conductor/tech-stack.md)** — approved technology stack and constraints

## Runtime & Deployment

- **[docs/architecture.md](./architecture.md)** — system design, reliability strategies, monitoring, security
- **[docs/setup.md](./setup.md)** — local development, Docker, Kubernetes, troubleshooting, production handoff
- **[docker-compose.prod.yml](../docker-compose.prod.yml)** — production service orchestration
- **[k8s/production.yaml](../k8s/production.yaml)** — Kubernetes manifests (namespaces, deployments, services, ingress)

## API Reference

- **[docs/api.md](./api.md)** — REST endpoints, WebSocket events, DTOs, error handling
- **Backend Swagger UI** — `/docs` when backend is running (interactive API explorer)
- **[packages/shared/](../packages/shared/)** — shared TypeScript DTOs and contracts

## Quick Links

| Task | Document |
|------|----------|
| Set up local dev environment | [docs/setup.md](./setup.md) |
| Understand system architecture | [docs/architecture.md](./architecture.md) |
| Call a backend API | [docs/api.md](./api.md) |
| Deploy to production | [docs/setup.md#kubernetes](./setup.md#kubernetes) |
| Prepare release artifacts | [docs/setup.md#production-handoff](./setup.md#production-handoff) |
| Add new feature | [AGENTS.md](../AGENTS.md) / [plan.md](../plan.md) |
| Troubleshoot errors | [docs/setup.md#operational-troubleshooting](./setup.md#operational-troubleshooting) |
| Check Bun commands | [README.md#bun-commands](../README.md#bun-commands) |

## Maintenance Rules

- **Update docs whenever:** behavior changes, API contracts change, new endpoints added, setup/deployment steps change
- **Keep in sync:** backend DTOs, OpenAPI schemas, and `docs/api.md`
- **Verify before committing:** `open http://localhost:3000/docs` (Swagger matches implementation)
- **Prefer clarity:** short, task-oriented sections that are easy to keep current
- **Cross-reference:** link between related docs to aid navigation
