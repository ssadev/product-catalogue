# Product Catalogue PoC — Design

Date: 2026-11-24
Status: approved 2026-11-24 (Tailwind CSS change requested by candidate)

## Intent

Take-home for an "AI-Native Engineer" role. An entrepreneur wants a product catalogue
proof of concept they can click through, that is **not throwaway**: product data source,
look and feel, and email provider are all expected to change. Reviewers score judgement
(design boundaries, assumptions, cuts, tests, AI practice), not feature count.
Time-box 2–3h. Deadline: Wed 25 Nov 2026, 12:00.

The candidate must defend every line and make a small live change in a 45-min follow-up,
so the code must stay small, conventional and easy to modify.

## Acceptance criteria (verbatim from brief)

```
Home page
GIVEN I have chosen 5 products to be "top rated"
WHEN I am viewing the home page
THEN I see those 5 featured products

Category page
GIVEN my products are organised into categories
WHEN I click on a category link
THEN I see top rated products for that category
  AND I see additional products in that category

Search
GIVEN I am looking for a specific product
  AND I have entered a search term in the search bar
WHEN I click the search button
THEN I only see products that have text matching that search term

Product page
GIVEN I am browsing the products
  AND I want to see more details about a specific product
WHEN I click on a product tile
THEN I see the product details page

Enquiry
GIVEN I am viewing a product
  AND I am interested in a product
  AND I click on the Enquire button
  AND I complete the subsequent form with my contact details
WHEN I submit the form
THEN the sales inbox will receive an email
  AND the customer will see a "Thank you" message
```

Other brief constraints: no direct Fake Store calls from client; AWS-compatible infra if any;
reviewer runs locally in < 10 min (one or two commands); no secrets, use `.env.example`;
no paid services/accounts; submit public repo, feature branch + open PR into `main`,
README, DECISIONS.md (assumptions, cuts, growth, next day), AI_USAGE.md (tools/models,
agent instruction files, plan/spec, 3–5 key prompts, where AI was wrong), time spent.

## Goals

- Meet the five acceptance criteria: home (5 featured), category page (top rated + others),
  search, product details, enquiry → email to sales inbox + "Thank you".
- Clear boundaries: client ↔ backend ↔ product data source ↔ email provider.
- Reviewer runs everything locally with one command (`docker compose up --build`) in < 10 min,
  no accounts, no paid services, no secrets committed.
- Tests on the critical path that give confidence to change code.
- Submission docs: README, DECISIONS.md, AI_USAGE.md, time spent, agent instruction file (CLAUDE.md).
- Work on a feature branch; PR into `main` left open with a strong description.

## Non-goals

Auth, cart/checkout, admin UI for curating featured products, persisting enquiries,
pagination (Fake Store has 20 products), i18n, cloud deployment / IaC, final visual design.

## Anti-goals (failure even if it works)

- UI coupled to Fake Store's response shape (swap of data source would touch the client).
- Client calling Fake Store directly (explicit constraint).
- Reviewer needs to sign up for anything (e.g. real SMTP account) to see the email.
- Over-engineered abstractions that cannot be explained in the interview.

## Constraints

- Client: React + Vite, TypeScript. Backend: Node.js + Express, TypeScript. (Chosen by candidate.)
- Any infra must be AWS-compatible (containers → ECS/App Runner later; no IaC now).
- `.env.example` for config; no secrets in git.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Monorepo, npm workspaces, `packages/shared` for types + zod schemas | One contract, no drift; fiddlier Docker builds and workspace tooling |
| **B (chosen)** | **Two independent apps (`web/`, `api/`), no shared package** | **Simplest builds, each app stands alone, easy to explain; DTO types duplicated in `web/`, drift risk accepted** |
| C | OpenAPI-first, generated client | Strongest contract; too heavy for the time-box |

Candidate picked **B**. Mitigation for drift: the API owns the contract; `web/src/api/types.ts`
mirrors it and is the only place the client knows the shape. Documented as a "next step"
(generate client types from an OpenAPI spec once the API stabilises).

## Architecture

```
browser ──► web (nginx: static build + /api proxy) ──► api (Express) ──► ProductCatalog ──► Fake Store API
                                                          │
                                                          ├──► FeaturedProducts (JSON config)
                                                          └──► EnquiryNotifier ──► SMTP (Mailpit locally)
```

Same-origin `/api` via proxy (nginx in Docker, Vite proxy in dev) → no CORS needed for the browser.

### Repo layout

```
api/            Express app (own package.json, Dockerfile, tests)
web/            React + Vite app (own package.json, Dockerfile + nginx.conf, tests)
docker-compose.yml   api, web, mailpit
.env.example
README.md  DECISIONS.md  AI_USAGE.md  CLAUDE.md
.github/workflows/ci.yml   typecheck + test both apps
docs/superpowers/specs/    this design + plan
```

### API (Express)

Layering inside `api/src`:

- `domain/` — `Product`, `Enquiry` types owned by us (not Fake Store's shape).
- `ports/` — interfaces: `ProductCatalog`, `FeaturedProducts`, `EnquiryNotifier`.
- `adapters/` — `FakeStoreCatalog` (fetch + map), `CachedCatalog` (TTL decorator),
  `JsonFeaturedProducts`, `SmtpEnquiryNotifier` (nodemailer).
- `services/` — `CatalogService` (featured, category split, search), `EnquiryService`.
- `http/` — routes, zod validation, error middleware.
- `app.ts` builds the Express app from injected dependencies (so tests pass in-memory fakes);
  `server.ts` wires real adapters from env (composition root).

Domain `Product`:
```ts
{ id: string; title: string; description: string; price: number /* AUD, dollars */;
  category: string; imageUrl: string; rating: { average: number; count: number } }
```
`id` is a string so a future data source (UUIDs, SKUs) does not change the contract.

Categories *(builder-check call)*: Fake Store category names contain spaces/apostrophes
(`men's clothing`). The API exposes our own `slug` (`mens-clothing`, derived: lowercase,
strip non-alphanumerics, hyphenate) plus display `name`. Slugs are used in URLs, client routes
and `featured.json` keys, so Fake Store naming never leaks into the contract. `Product.category`
holds the slug; clients look up the display name from `/api/categories`.

Fixture catalogue *(builder-check call)*: `FixtureCatalog` adapter reads a bundled snapshot of
Fake Store products (`api/fixtures/products.json`), selected with `PRODUCT_SOURCE=fixture`
(default `fakestore`). Reasons: reviewer demo still works if Fake Store is down/blocked; tests
use real-shaped data; and a second adapter proves the `ProductCatalog` port is real, not decorative.
No automatic fallback (hides outages); switching is explicit via env, documented in README.

Endpoints (all JSON, errors as `{ error: { code, message } }`):

| Method | Path | Result |
|---|---|---|
| GET | `/api/health` | `{ status: "ok" }` |
| GET | `/api/categories` | `Category[]` = `{ slug: string; name: string }[]` |
| GET | `/api/products/featured` | `Product[]` (home "top rated", up to 5) |
| GET | `/api/categories/:slug/products` | `{ category: Category; topRated: Product[]; others: Product[] }`, 404 unknown slug |
| GET | `/api/products?q=term` | `Product[]` matching term; 400 if `q` empty/blank |
| GET | `/api/products/:id` | `Product` or 404 |
| POST | `/api/enquiries` | 202 `{ status: "received" }`; 400 validation; 404 unknown product |

Data source behaviour:
- Fake Store `/products` returns the full catalogue (20 items). `FakeStoreCatalog` fetches it once,
  `CachedCatalog` caches for `CATALOG_CACHE_TTL_SECONDS` (default 300). All filtering is in memory.
- Fetch timeout 5s (`AbortSignal.timeout`). Upstream failure → 502 `UPSTREAM_UNAVAILABLE`.
- Fake Store response validated with zod at the adapter boundary; bad items fail loudly in logs.

Featured / "top rated" (candidate's assumption, recorded in DECISIONS.md):
- `api/config/featured.json`: `{ "home": [5 ids], "categories": { "<slug>": [ids] } }`.
  "I have chosen 5 products" = owner curation, not Fake Store's rating.
- Home: curated ids in configured order; unknown ids skipped with a warning log.
- Category page: curated ids for that category if configured, else top 3 by `rating.average`
  (tie-break `rating.count`). `others` = remaining products in the category.
- Path to config is env-driven (`FEATURED_CONFIG_PATH`) so it can later move to a CMS/DB
  behind the same `FeaturedProducts` port.

Search (assumption): case-insensitive substring match of trimmed term against title,
description and category. Fake Store has no search endpoint, so it is done in `CatalogService`;
a real data source would implement search natively behind the port later.

Enquiry:
- Body: `{ productId: string; name: string (1–100); email: string (email); phone?: string (≤30, digits/space/+()-); message?: string (≤1000) }`, unknown fields rejected.
- Service checks product exists, then sends email to `SALES_INBOX_EMAIL` from `MAIL_FROM`,
  `replyTo` = customer email, subject `New enquiry: <product title>`, plain-text body
  (no HTML → no HTML injection). Product title/price included so sales has context.
- Enquiries are not persisted (non-goal). If SMTP fails → 502 `NOTIFICATION_FAILED`, the client
  shows an error, so the customer never sees "Thank you" for a lost enquiry.

Security basics: `helmet`, JSON body limit 10kb, `express-rate-limit` on `POST /api/enquiries`
(e.g. 5/min/IP), zod on all inputs, no stack traces in responses, `trust proxy` set for nginx.

Config (`.env.example`): `PORT`, `FAKESTORE_BASE_URL`, `CATALOG_CACHE_TTL_SECONDS`,
`FEATURED_CONFIG_PATH`, `PRODUCT_SOURCE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`,
`MAIL_FROM`, `SALES_INBOX_EMAIL`. Validated with zod at startup; process exits on bad config.
Compose ships working defaults so no `.env` is needed to run.

### Web (React + Vite)

- React Router routes: `/` home, `/category/:slug`, `/search?q=`, `/products/:id`.
- Layout: header with brand, search bar (input + Search button), category nav links.
- Components: `ProductTile` (links to detail), `ProductGrid`, `EnquiryForm`, loading/error/empty states.
- Product page: details + **Enquire** button → reveals inline `EnquiryForm` (name, email, phone,
  message) → on 202 replaces form with "Thank you" message; on error shows message and keeps input.
- Search: submitted only via button/Enter (per AC "when I click the search button"); URL holds `q`
  so results are linkable; blank term disables the button.
- `src/api/client.ts` + `src/api/types.ts`: the only code that knows URLs/shapes. Components use
  a small `useApi` hook (loading/error/data) — no extra data library.
- Look and feel *(candidate decision)*: Tailwind CSS v4 via `@tailwindcss/vite`. Brand design
  tokens (colours, fonts, radii) defined once in `src/index.css` under `@theme` and used as
  semantic utilities (`bg-brand`, `text-ink-muted`, …) rather than raw palette classes, so the
  incoming creative work is a token swap, not a rewrite. Minimal, clean, responsive grid.

### Docker / local run

- `docker compose up --build` starts: `mailpit` (SMTP 1025, UI http://localhost:8025),
  `api` (3001, internal), `web` (http://localhost:8080, nginx serves build, proxies `/api` → api).
- Node 22 LTS alpine images, multi-stage builds, non-root user for api.
- Also runnable without Docker: `npm install && npm run dev` in each app (Mailpit still via compose).

### Testing

- API (vitest + supertest), in-memory fakes injected into `createApp`:
  - featured: returns curated order, skips unknown ids
  - category: curated vs fallback-by-rating split, others exclude top rated, 404 unknown
  - search: matches title/description/category case-insensitively, 400 blank
  - product by id: 200 / 404
  - enquiry: 202 + notifier called with expected payload; 400 invalid email/missing name/extra fields;
    404 unknown product; 502 when notifier throws
  - upstream down → 502
  - `FakeStoreCatalog` mapping with mocked `fetch`; `CachedCatalog` TTL behaviour
- Web (vitest + React Testing Library, api client mocked):
  - home renders featured tiles linking to product pages
  - search: typing + clicking Search navigates and shows only results
  - enquiry: Enquire → fill → submit → "Thank you"; server error → error shown, no thank-you
- CI: GitHub Actions runs typecheck + tests for both apps on PR.
- Manual check: run compose, submit enquiry, see email in Mailpit.
- Out of scope (next day): Playwright e2e across the stack, contract tests.

### Cut order if over time-box (candidate-approved)

1. CI workflow
2. Rate limiting (record in DECISIONS.md instead)
3. Fixture adapter
4. Web tests trimmed to enquiry flow only

Never cut: the five acceptance criteria, API tests, docker compose, submission docs.

### AI usage record

AI_USAGE.md is drafted from this Claude Code session (Claude Opus 5.5 + superpowers
brainstorming/planning skills + a builder-check subagent) and reviewed/edited by the candidate.
Candidate also used ChatGPT; candidate supplies what for. Candidate logs real clock time
(start ≈ 12:03, 24 Nov 2026) and the planning/building/testing/review split.

### Git / submission

- `main` gets an initial commit (README stub). Work on `feat/product-catalogue-poc`.
- PR into `main`, left open; description covers what/why, how to run, decisions, test evidence, AI usage.
- Public GitHub repo under candidate's account (`gh` is authenticated).

## Left to the builder

Exact component/file names inside the layers above, CSS details, test file organisation,
logging format (console with level prefix is fine), choice of which 5 product ids to feature
(pick a spread across categories).
