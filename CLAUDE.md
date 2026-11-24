# CLAUDE.md — agent instructions

Product catalogue proof of concept (take-home): React web client + Express API in front of the
Fake Store API, with enquiries emailed to a sales inbox (Mailpit locally). It is meant to grow,
not be thrown away: data source, look and feel, and email provider are expected to change.

Design: `docs/superpowers/specs/2026-11-24-product-catalogue-design.md`
Plan: `docs/superpowers/plans/2026-11-24-product-catalogue-poc.md`

## Layout

- `api/` — Express 5 + TypeScript. Ports in `src/ports.ts`, adapters in `src/adapters/`,
  services in `src/services/`, HTTP in `src/http/`, wiring only in `src/server.ts`.
- `web/` — React + Vite + TypeScript + Tailwind CSS v4.
- `docker-compose.yml` — mailpit + api + web (nginx).

## Rules

- The API owns the contract. `web/src/api/types.ts` mirrors it and `web/src/api/client.ts` is the
  only web code that knows URLs or response shapes.
- The web app never calls Fake Store (or any third party) directly; everything goes via `/api`.
- Domain types are ours, never a provider's shape. Product ids are strings; categories are slugs.
- A new data source or email provider = a new adapter implementing a port in `api/src/ports.ts`,
  wired in `api/src/server.ts` only. Services and routes must not change for a provider swap.
- Errors use `{ error: { code, message, details? } }`; never leak stack traces.
- Validate every external input with zod (request bodies, query strings, env, provider responses).
- Styling: Tailwind semantic token utilities defined under `@theme` in `web/src/index.css`
  (`bg-brand`, `text-ink`, `text-ink-muted`, `bg-surface`, `border-line`), not raw palette classes.
- TDD with vitest: write the failing test first. Before committing, run in each touched app:
  `npm run typecheck && npm test`.
- Never commit secrets; add new config to `.env.example` with a safe default.
- Conventional commit messages.
