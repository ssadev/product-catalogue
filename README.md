# Product Catalogue PoC

A proof of concept product catalogue that is meant to grow rather than be thrown away.
Customers can browse featured products, browse by category, search, view a product and send an
enquiry, which is emailed to the sales inbox.

- **Client:** React 19 + Vite + TypeScript + Tailwind CSS v4 (`web/`)
- **Backend:** Node.js + Express 5 + TypeScript (`api/`)
- **Product data:** [Fake Store API](https://fakestoreapi.com), only ever called by the backend
- **Email:** SMTP, delivered to a local [Mailpit](https://mailpit.axllent.org) inbox, so no account is needed

See [DECISIONS.md](DECISIONS.md) for assumptions, trade-offs and what comes next, and
[AI_USAGE.md](AI_USAGE.md) for how AI tools were used.

## Why this stack

The brief prefers TypeScript on both sides; React + Vite and Express are mainstream, quick to
start, and the stack I can explain and change most confidently. Two independent apps (rather than a
monorepo with a shared types package) keeps builds and Dockerfiles simple. The API owns the
contract and `web/src/api/types.ts` mirrors it (see DECISIONS.md for the trade-off).

## Run it (Docker, about 2 minutes)

Prerequisite: Docker Desktop (or Docker Engine with Compose v2).

```bash
docker compose up --build
```

| What | URL |
|---|---|
| Catalogue | http://localhost:8080 |
| Sales inbox (Mailpit) | http://localhost:8025 |

Try it: open the home page (5 featured products), pick a category, search for `jacket`, open a
product, click **Enquire**, submit the form, then open the Mailpit inbox to see the email.

No `.env` file is needed. To override settings, copy `.env.example` to `.env` and edit it.

### Offline / if Fake Store is down

The API can serve a bundled snapshot of the Fake Store catalogue instead of calling it live:

```bash
PRODUCT_SOURCE=fixture docker compose up --build
```

(Product images are still loaded from fakestoreapi.com by the browser.)

### Change the featured ("top rated") products

Edit `api/config/featured.json`. `home` lists the 5 product ids for the home page; `categories`
optionally lists curated ids per category slug. Categories without an entry show their 3
highest-rated products. In Docker, rebuild the api (`docker compose up --build api`); when running
locally the file is re-read on every request.

## Configuration

All configuration is environment variables, validated at startup (the API exits with a clear
message if a value is invalid). Defaults work out of the box.

| Variable | Default | Purpose |
|---|---|---|
| `PRODUCT_SOURCE` | `fakestore` | `fakestore` (live API) or `fixture` (bundled snapshot) |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | Fake Store base URL |
| `CATALOG_CACHE_TTL_SECONDS` | `300` | How long the API caches the catalogue |
| `FEATURED_CONFIG_PATH` | `config/featured.json` | Curated featured products file (relative to `api/`) |
| `SMTP_HOST` / `SMTP_PORT` | `mailpit` / `1025` in Docker, `localhost` / `1025` locally | SMTP server |
| `SMTP_SECURE` | `false` | Use TLS for SMTP |
| `SMTP_USER` / `SMTP_PASS` | empty | SMTP credentials (put real ones in `.env` only, never commit them) |
| `MAIL_FROM` | `catalogue@example.com` | Sender address |
| `SALES_INBOX_EMAIL` | `sales@example.com` | Where enquiries are sent |
| `PORT` | `3001` | API port |

## Run without Docker (development)

Requires Node.js 22+ (24 recommended).

```bash
docker compose up -d mailpit          # local inbox on :8025, SMTP on :1025
cd api && npm install && npm run dev  # http://localhost:3001
cd web && npm install && npm run dev  # http://localhost:5173, proxies /api to :3001
```

## Tests

```bash
cd api && npm test        # 71 tests: adapters, services, HTTP routes (supertest)
cd web && npm test        # 30 tests: API client, components, pages (React Testing Library)
npm run typecheck         # in either app
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build for both apps, plus a Docker build,
on every pull request.

## API

All responses are JSON. Errors look like `{ "error": { "code": "NOT_FOUND", "message": "…" } }`.

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{ status: "ok" }` |
| GET | `/api/categories` | `[{ slug, name }]` |
| GET | `/api/products/featured` | Up to 5 curated products |
| GET | `/api/categories/:slug/products` | `{ category, topRated, others }`; 404 for an unknown category |
| GET | `/api/products?q=term` | Products whose title, description or category contains `term`; 400 if blank |
| GET | `/api/products/:id` | One product; 404 if unknown |
| POST | `/api/enquiries` | `{ productId, name, email, phone?, message? }` → 202; 400 invalid, 404 unknown product, 429 rate limited, 502 email failed |

## Project structure

```
api/
  src/
    domain/        Product, Category, Enquiry: our model, not Fake Store's
    ports.ts       ProductCatalog, FeaturedProducts, EnquiryNotifier interfaces
    adapters/      FakeStoreCatalog, FixtureCatalog, CachedCatalog, JsonFeaturedProducts, SmtpEnquiryNotifier
    services/      CatalogService (featured, category split, search), EnquiryService, email formatting
    http/          routes, validation, error handling
    app.ts         builds the Express app from injected dependencies
    server.ts      composition root: picks adapters from config
  config/featured.json
  fixtures/products.json
web/
  src/
    api/           client.ts (all HTTP calls), types.ts (contract mirror), useApi.ts
    components/    Layout, SearchBar, CategoryNav, ProductTile/Grid, EnquiryForm, StatusMessage
    pages/         Home, Category, Search, Product, NotFound
    index.css      Tailwind + design tokens (@theme)
docs/superpowers/  design spec and implementation plan
```
