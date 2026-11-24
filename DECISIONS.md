# Decisions and assumptions

## Assumptions (where the acceptance criteria leave gaps)

| Topic | Assumption | Why |
|---|---|---|
| "I have chosen 5 products to be top rated" | The owner picks them: a list of product ids in `api/config/featured.json`, shown in that order. Fake Store's `rating` is **not** used for the home page. | "I have chosen" describes curation, not a computed ranking. |
| Category "top rated" | Curated ids for that category if configured; otherwise the 3 highest-rated products (ties broken by review count). All remaining products in the category appear below under "More in …". | Keeps the owner in control without leaving pages empty for categories nobody has curated yet. |
| Curated id no longer exists | Skipped with a warning log; the page still renders. | A removed product should never break the home page. |
| Search scope | Case-insensitive, literal substring match on title, description and category name. Search runs on the button click (or Enter) and the term is kept in the URL (`/search?q=`) so results can be shared. Blank terms are rejected. | "Text matching that search term" is broad; these are the fields a customer can see. Fake Store has no search endpoint, so the API filters its cached catalogue. |
| Contact details | Name and email required; phone and message optional. | Enough for sales to reply; fewer fields means more enquiries. |
| Sales inbox | One configurable address (`SALES_INBOX_EMAIL`). The email is plain text with `Reply-To` set to the customer. | Sales can reply directly; plain text avoids HTML injection from customer input. |
| "Thank you" | Shown only after the API confirms the email was handed to the mail server. If sending fails, the customer sees an error and keeps their input. | Never thank a customer for an enquiry that was lost. |
| Currency | Prices shown as AUD (`en-AU`). | Fake Store has no currency; the business appears to be Australian. |
| Category names | Fake Store names are kept for display (including its spelling "jewelery"); URLs and config use our own slugs (`mens-clothing`). | Display text is cosmetic; slugs keep provider naming out of the API contract. |
| Product images | Image URLs come from our API, but the browser loads the image files from fakestoreapi.com. | The rule is about product **data**; proxying images is a next step (see below). |

## Dropped or simplified

| What | Why |
|---|---|
| Storing enquiries | Email is the requirement. Storing them (and an outbox for reliable delivery) is the first thing I'd add next. |
| Admin UI for featured products | A JSON file is enough for a PoC and sits behind the `FeaturedProducts` interface, so a CMS or admin screen can replace it. |
| Real email provider | The reviewer must not need an account. SMTP to Mailpit works locally; SES/SendGrid/Postmark all accept SMTP, so switching is configuration. |
| Pagination, sorting, filters | Fake Store has 20 products. |
| End-to-end browser tests | Covered by API tests (supertest) + UI tests (React Testing Library) + a manual browser walkthrough. Playwright is next. |
| Auth, cart, checkout, i18n | Out of scope for an enquiry-based catalogue. |
| Infrastructure as code | Not required to run locally. The containers are AWS-compatible (ECS/Fargate or App Runner). |
| Final visual design | Creative work is in progress; styling is minimal and driven by design tokens. |

## How the design supports growth

The brief says the **product data source**, **look and feel** and **email provider** will change.
Each one has its own seam:

- **Product data source.** The API depends on a `ProductCatalog` interface (`api/src/ports.ts`).
  Fake Store is one adapter (`FakeStoreCatalog`) that validates the response with zod and maps it to
  our own `Product`/`Category` model. A second adapter (`FixtureCatalog`) already exists, which shows
  the seam works. A caching decorator (`CachedCatalog`) wraps any source. A PIM, database or
  headless commerce platform would be a new adapter wired in `server.ts`; services, routes and the web
  app would not change. Product ids are strings and categories are our own slugs, so the contract
  survives a source with UUIDs/SKUs.
- **Email provider.** `EnquiryNotifier` interface; `SmtpEnquiryNotifier` today. A provider SDK (SES,
  or posting to a CRM instead of email) is a new adapter. Email formatting is a pure function, tested
  separately.
- **Curation.** `FeaturedProducts` interface; JSON file today, CMS/admin later.
- **Look and feel.** Tailwind with design tokens defined once under `@theme` in
  `web/src/index.css`. Components use semantic names (`bg-brand`, `text-ink-muted`, `border-line`),
  so the incoming brand is mostly a token change. Components are small and presentational; data
  loading sits in pages and `useApi`.
- **Frontend/backend boundary.** The browser only talks to `/api` on its own origin (nginx in Docker,
  the Vite proxy in development). `web/src/api/client.ts` is the only code that knows URLs and
  `web/src/api/types.ts` mirrors the contract.
- **Operations.** Config is validated at startup; errors share one JSON shape with codes; the
  containers are stateless, so they can scale horizontally behind a load balancer (the in-memory
  cache and rate limiter become Redis-backed when there is more than one instance).

### Approaches considered for the repo shape

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| A | Monorepo with npm workspaces and a shared types/zod package | One contract, no drift; fiddlier Docker builds and tooling | AI's recommendation, not chosen |
| **B** | **Two independent apps, types mirrored in `web/`** | **Simplest builds, each app stands alone; drift risk accepted** | **Chosen** |
| C | OpenAPI-first with a generated client | Strongest contract; too heavy for the time-box | Next step once the API settles |

## Security basics

- All input validated with zod: request bodies (strict, unknown fields rejected), query strings,
  environment, and the Fake Store response.
- Enquiry name rejects control characters (no header injection); the email is plain text; the
  subject only uses our product title, with line breaks removed.
- `helmet` headers, 10 kB JSON body limit, rate limit on `POST /api/enquiries` (5/min per IP).
- No stack traces or internal messages in responses; upstream timeouts (5 s) become 502.
- No secrets in the repo; `.env` is git-ignored and `.env.example` holds safe defaults.

## What I'd do next with another day

1. **Store enquiries and send email from an outbox** (database plus a queue such as SQS), so an email
   provider outage never loses an enquiry, and sales gets a list to work from.
2. **Playwright end-to-end tests** against `docker compose` in CI, covering the five acceptance criteria.
3. **OpenAPI spec for the API** and generated client types, removing the hand-mirrored `types.ts`.
4. **Image proxy/CDN** (e.g. CloudFront) so the browser never hits the data provider, with resizing.
5. **Observability:** structured logs with request ids, health/readiness split, basic metrics.
6. **Accessibility and UX pass** once the creative work lands: focus management after "Thank you",
   skeleton loaders, empty states.
7. **Deployment sketch:** ECS Fargate (or App Runner) for the api, S3 + CloudFront for the web, SES for
   email, Secrets Manager for SMTP credentials.
