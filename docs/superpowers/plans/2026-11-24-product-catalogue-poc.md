# Product Catalogue PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Product catalogue PoC (home featured, category, search, product detail, enquiry → email) with swappable data source, look and feel, and email provider, runnable with `docker compose up --build`.

**Architecture:** Two independent apps. `api/` is Express 5 + TS with ports/adapters (`ProductCatalog`, `FeaturedProducts`, `EnquiryNotifier`) wired in a composition root; it is the only thing that talks to Fake Store and SMTP. `web/` is React + Vite + Tailwind v4, talks only to same-origin `/api` (Vite proxy in dev, nginx in Docker). Mailpit captures email locally.

**Tech Stack:** Node 22 LTS (Docker; local Node 24 ok), TypeScript 7, Express 5, zod 4, nodemailer 10, helmet 8, express-rate-limit 8, vitest 5, supertest 7, tsx; React 19, Vite 8, react-router 8, Tailwind CSS 4 (`@tailwindcss/vite`), @testing-library/react 16, jsdom; Mailpit `axllent/mailpit:v1.27`.

**Spec:** `docs/superpowers/specs/2026-11-24-product-catalogue-design.md`

## Global Constraints

- Client never calls Fake Store; all product data via `api/`.
- No secrets committed; `.env.example` at root; compose works with zero `.env`.
- No paid services/accounts; email goes to Mailpit (UI `http://localhost:8025`, SMTP `mailpit:1025`).
- App at `http://localhost:8080`; api listens on `3001` inside compose (not published to host; web reaches it via nginx).
- Error body shape everywhere: `{ "error": { "code": string, "message": string, "details"?: unknown } }`. No stack traces in responses.
- Error codes: `NOT_FOUND` 404, `VALIDATION_ERROR` 400, `RATE_LIMITED` 429, `UPSTREAM_UNAVAILABLE` 502, `NOTIFICATION_FAILED` 502, `INTERNAL_ERROR` 500.
- API JSON body limit `10kb`; `helmet()`; `app.set('trust proxy', 1)`.
- Domain types are ours, never Fake Store's shape; product `id` is a string; category identified by slug.
- Prices displayed `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })` (assumption: treat Fake Store prices as AUD).
- Tailwind tokens defined once under `@theme` in `web/src/index.css`; components use semantic token utilities (`bg-brand`, `text-ink`, `text-ink-muted`, `bg-surface`, `border-line`), not raw palette classes.
- ESM everywhere (`"type": "module"`); api TS uses `module`/`moduleResolution` `NodeNext` (relative imports end in `.js`).
- Use latest stable majors listed in Tech Stack. If a major's API blocks progress, pin previous major and note it in DECISIONS.md.
- Conventional commit messages, each ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Cut order if over time-box: CI → rate limiting → fixture adapter → web tests beyond enquiry flow.

## Review Focus

- Fake Store down/slow/garbage → api 502 `UPSTREAM_UNAVAILABLE` within ~5s; web shows error state, not blank page. (Tests: Task 2 adapter, Task 3 route, Task 7 page error state.)
- Search term with regex metacharacters or padding (`"  (shirt "`) → treated literally, trimmed, no 500. (Test: Task 3.)
- Enquiry name containing CR/LF or control chars (`"Bob\r\nBcc: x@y.z"`) → 400; email is plain text, subject only from product title. (Tests: Task 4.)
- Unknown product id / category slug in URL (`/products/999`, `/category/nope`) → api 404; web shows "not found" message. (Tests: Task 3, Task 7.)
- Double-click Submit on enquiry → one request; button disabled while submitting. (Test: Task 8.)

---

## File Structure

```
.gitignore  .env.example  docker-compose.yml  README.md  DECISIONS.md  AI_USAGE.md  CLAUDE.md
.github/workflows/ci.yml
api/
  package.json tsconfig.json vitest.config.ts Dockerfile .dockerignore
  config/featured.json
  fixtures/products.json                 # Fake Store /products snapshot (20 items)
  src/
    server.ts                            # composition root: config → adapters → services → app.listen
    app.ts                               # createApp(deps): Express
    config.ts                            # loadConfig(env) zod-validated
    errors.ts                            # AppError + subclasses
    domain/product.ts  domain/enquiry.ts
    ports.ts                             # ProductCatalog, FeaturedProducts, EnquiryNotifier
    adapters/slug.ts  adapters/fakeStoreCatalog.ts  adapters/fixtureCatalog.ts  adapters/cachedCatalog.ts
    adapters/jsonFeaturedProducts.ts  adapters/smtpEnquiryNotifier.ts
    services/catalogService.ts  services/enquiryService.ts  services/enquiryEmail.ts
    http/productRoutes.ts  http/enquiryRoutes.ts  http/errorHandler.ts  http/validation.ts
  test/ (mirrors src; *.test.ts) test/helpers.ts
web/
  package.json tsconfig*.json vite.config.ts Dockerfile nginx.conf .dockerignore index.html
  src/
    main.tsx  App.tsx (routes)  index.css (tailwind + @theme)
    api/types.ts  api/client.ts  api/useApi.ts
    lib/formatPrice.ts
    components/Layout.tsx SearchBar.tsx CategoryNav.tsx ProductTile.tsx ProductGrid.tsx StatusMessage.tsx EnquiryForm.tsx
    pages/HomePage.tsx CategoryPage.tsx SearchPage.tsx ProductPage.tsx NotFoundPage.tsx
  src/test/setup.ts  src/test/fixtures.ts  + *.test.tsx next to components/pages
```

---

### Task 0: Repo bootstrap

**Files:** Create `.gitignore`, `README.md` (stub: title + "see feature branch PR"), `CLAUDE.md`.

- [ ] **Step 1:** `git init -b main` in project root. `.gitignore`: `node_modules/`, `dist/`, `.env`, `coverage/`, `.DS_Store`, `*.log`.
- [ ] **Step 2:** Write `CLAUDE.md` (agent instructions, committed): project purpose (1 line), layout (`api/`, `web/`), rules: API owns contract and `web/src/api/types.ts` mirrors it; never call Fake Store from web; new data source/email provider = new adapter implementing port in `api/src/ports.ts`, wired in `server.ts` only; TDD with vitest; run `npm test` + `npm run typecheck` in both apps before commit; no secrets; Tailwind semantic tokens only.
- [ ] **Step 3:** Commit on `main`: `git add -A && git commit -m "chore: initial commit with design spec, plan and agent instructions"`.
- [ ] **Step 4:** `git switch -c feat/product-catalogue-poc`. All later tasks commit here.

### Task 1: API skeleton, config, errors, health

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/vitest.config.ts`, `api/src/{app.ts,config.ts,errors.ts,ports.ts,domain/product.ts,domain/enquiry.ts,http/errorHandler.ts,http/validation.ts}`
- Test: `api/test/app.test.ts`, `api/test/config.test.ts`, `api/test/helpers.ts`

**Interfaces — Produces:**
```ts
// domain/product.ts
export interface Category { slug: string; name: string }
export interface Product { id: string; title: string; description: string; price: number; category: string /* slug */; imageUrl: string; rating: { average: number; count: number } }
export interface Catalogue { products: Product[]; categories: Category[] }
// domain/enquiry.ts
export interface Enquiry { productId: string; name: string; email: string; phone?: string; message?: string }
// ports.ts
export interface ProductCatalog { getCatalogue(): Promise<Catalogue> }
export interface FeaturedConfig { home: string[]; categories: Record<string, string[]> }
export interface FeaturedProducts { getFeatured(): Promise<FeaturedConfig> }
export interface EnquiryNotifier { notify(enquiry: Enquiry, product: Product): Promise<void> }
// errors.ts
export class AppError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown) }
export class NotFoundError extends AppError      // 404 NOT_FOUND
export class ValidationError extends AppError    // 400 VALIDATION_ERROR, details: { path: string; message: string }[]
export class UpstreamError extends AppError      // 502 UPSTREAM_UNAVAILABLE
export class NotificationError extends AppError  // 502 NOTIFICATION_FAILED
// http/validation.ts
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T  // throws ValidationError
// app.ts — final shape after Task 4; Task 1 starts with `{}`, Task 3 adds `catalog`, Task 4 adds `enquiries` + `enquiryRateLimit`
export interface AppDeps { catalog: CatalogService; enquiries: EnquiryService; enquiryRateLimit?: { windowMs: number; limit: number } }
export function createApp(deps: AppDeps): Express
// config.ts
export interface Config { port: number; fakeStoreBaseUrl: string; catalogCacheTtlSeconds: number; featuredConfigPath: string; productSource: 'fakestore' | 'fixture'; smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string }; mailFrom: string; salesInboxEmail: string }
export function loadConfig(env: NodeJS.ProcessEnv): Config  // throws Error listing invalid vars
```
In Task 1, `createApp` mounts only middleware, `/api/health`, 404 fallback and error handler.

- [ ] **Step 1: Scaffold.** `api/package.json` scripts: `dev: tsx watch src/server.ts`, `build: tsc -p tsconfig.json`, `start: node dist/server.js`, `test: vitest run`, `typecheck: tsc --noEmit`. Deps: `express zod nodemailer helmet express-rate-limit`; dev: `typescript tsx vitest supertest @types/express @types/node @types/nodemailer @types/supertest`. tsconfig: `strict`, `target ES2023`, `module/moduleResolution NodeNext`, `outDir dist`, `rootDir src`, include `src`; tests type-checked via vitest (add `test` to a separate include or `tsconfig.test.json` if `rootDir` conflicts).
- [ ] **Step 2: Failing tests** in `api/test/app.test.ts`:
  - `GET /api/health` → 200 `{ status: "ok" }`
  - `GET /api/nope` → 404 body `{ error: { code: "NOT_FOUND" } }` (use `toMatchObject`)
  - malformed JSON `POST /api/health` with `Content-Type: application/json` body `{` → 400 `VALIDATION_ERROR`
  - route throwing plain `Error` (mount test-only route via exported `errorHandler` on a tiny express app) → 500 `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }`, no `stack` key.
  
  `api/test/config.test.ts`:
  - `loadConfig({})` returns defaults: port `3001`, fakeStoreBaseUrl `https://fakestoreapi.com`, catalogCacheTtlSeconds `300`, featuredConfigPath `config/featured.json`, productSource `fakestore`, smtp `{ host: "localhost", port: 1025, secure: false }`, mailFrom `catalogue@example.com`, salesInboxEmail `sales@example.com`
  - `loadConfig({ SALES_INBOX_EMAIL: "nope" })` throws `/SALES_INBOX_EMAIL/`
  - `loadConfig({ PRODUCT_SOURCE: "csv" })` throws `/PRODUCT_SOURCE/`
- [ ] **Step 3:** Run `cd api && npm test` → FAIL (modules missing).
- [ ] **Step 4: Implement** files above. Error handler maps `AppError` → its status/code; body-parser `SyntaxError` (`type === 'entity.parse.failed'`) → 400 VALIDATION_ERROR; payload too large (`type === 'entity.too.large'`) → 413 `PAYLOAD_TOO_LARGE`; anything else → log `console.error` + 500. `SMTP_SECURE` parsed from `"true"/"false"`.
- [ ] **Step 5:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(api): express skeleton with config, error handling and health check`.

### Task 2: Catalogue adapters (Fake Store, fixture, cache)

**Files:**
- Create: `api/src/adapters/{slug.ts,fakeStoreCatalog.ts,fixtureCatalog.ts,cachedCatalog.ts}`, `api/fixtures/products.json`
- Test: `api/test/adapters/{slug,fakeStoreCatalog,fixtureCatalog,cachedCatalog}.test.ts`

**Interfaces — Produces:**
```ts
export function toSlug(name: string): string
export function mapFakeStoreProducts(raw: unknown): Catalogue          // zod-validates, throws UpstreamError on bad shape
export class FakeStoreCatalog implements ProductCatalog { constructor(opts: { baseUrl: string; timeoutMs?: number /* default 5000 */; fetchFn?: typeof fetch }) }
export class FixtureCatalog implements ProductCatalog { constructor(filePath: string) }
export class CachedCatalog implements ProductCatalog { constructor(inner: ProductCatalog, ttlMs: number, now?: () => number) }
```

- [ ] **Step 1:** `curl -s https://fakestoreapi.com/products -o api/fixtures/products.json`; verify 20 items. Categories present: `men's clothing`, `jewelery` (sic), `electronics`, `women's clothing`.
- [ ] **Step 2: Failing tests:**
  - `toSlug("men's clothing") === "mens-clothing"`, `toSlug("women's clothing") === "womens-clothing"`, `toSlug("jewelery") === "jewelery"`, `toSlug("  TV & Audio ") === "tv-audio"`.
  - `mapFakeStoreProducts(fixture)`: 20 products; product id `"3"` → `{ id: "3", title: "Mens Cotton Jacket", price: 55.99, category: "mens-clothing", rating: { average: 4.7, count: 500 } }` and `imageUrl` from `image`; categories in first-seen order `[{ slug: "mens-clothing", name: "men's clothing" }, { slug: "jewelery", name: "jewelery" }, { slug: "electronics", name: "electronics" }, { slug: "womens-clothing", name: "women's clothing" }]`.
  - `mapFakeStoreProducts([{ id: 1 }])` throws `UpstreamError`.
  - `FakeStoreCatalog` with `fetchFn` stub: calls `${baseUrl}/products`; non-2xx → `UpstreamError`; `fetchFn` rejecting (network/abort) → `UpstreamError`; passes an `AbortSignal` (assert `init.signal` defined).
  - `FixtureCatalog` returns same as mapping the file.
  - `CachedCatalog`: two calls within TTL → inner called once; after `now` advances past TTL → twice; inner rejecting → error propagates and next call retries (failure not cached); concurrent calls share one in-flight promise.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement.** `toSlug`: lowercase, trim, drop `'`, replace runs of non-`[a-z0-9]` with `-`, strip leading/trailing `-`. Fake Store fetch uses `AbortSignal.timeout(timeoutMs)`.
- [ ] **Step 5:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(api): fake store, fixture and cached catalogue adapters`.

### Task 3: Catalogue service, featured config, product routes

**Files:**
- Create: `api/config/featured.json`, `api/src/adapters/jsonFeaturedProducts.ts`, `api/src/services/catalogService.ts`, `api/src/http/productRoutes.ts`; modify `api/src/app.ts`
- Test: `api/test/services/catalogService.test.ts`, `api/test/http/productRoutes.test.ts`, `api/test/adapters/jsonFeaturedProducts.test.ts`, extend `api/test/helpers.ts`

**Interfaces — Produces:**
```ts
export class JsonFeaturedProducts implements FeaturedProducts { constructor(filePath: string) }   // reads + zod-validates on each call (cheap; lets owner edit without restart)
export const HOME_FEATURED_LIMIT = 5; export const FALLBACK_TOP_RATED_COUNT = 3;
export interface CategoryProducts { category: Category; topRated: Product[]; others: Product[] }
export class CatalogService {
  constructor(catalog: ProductCatalog, featured: FeaturedProducts)
  listCategories(): Promise<Category[]>
  getFeatured(): Promise<Product[]>
  getCategoryProducts(slug: string): Promise<CategoryProducts>   // NotFoundError on unknown slug
  search(term: string): Promise<Product[]>                       // term assumed trimmed, non-empty
  getProduct(id: string): Promise<Product>                       // NotFoundError
}
// test/helpers.ts
export function fixtureCatalog(): ProductCatalog; export function staticFeatured(cfg: FeaturedConfig): FeaturedProducts; export function buildTestApp(overrides?): { app: Express; notifier: { calls: [Enquiry, Product][]; fail: boolean } }
```
Routes (in `productRoutes.ts`, mounted at `/api`): `GET /categories`, `GET /products/featured`, `GET /categories/:slug/products`, `GET /products?q=`, `GET /products/:id`. `featured` route must be registered before `:id`.

- [ ] **Step 1:** `api/config/featured.json`: `{ "home": ["3", "5", "12", "18", "11"], "categories": { "electronics": ["12", "9"] } }`.
- [ ] **Step 2: Failing service tests** (fixture catalogue + static featured):
  - `getFeatured()` with config home `["3","5","12","18","11"]` → ids in that order.
  - home `["3","999","5"]` → `["3","5"]` (unknown skipped, `console.warn` called).
  - home of 7 ids → first 5 only.
  - `getCategoryProducts("electronics")` with categories `{ electronics: ["12","9"] }` → topRated ids `["12","9"]`, others = remaining electronics `["10","11","13","14"]` (fixture order).
  - `getCategoryProducts("mens-clothing")` (no curation) → topRated `["3","2","1"]` (rating 4.7, 4.1, 3.9), others `["4"]`.
  - curated id from another category (`{ electronics: ["3"] }`) is ignored → falls back to rating: topRated `["12","11","9"]` (12 and 11 both 4.8, tie-break count 400 > 319), others `["10","13","14"]`.
  - `getCategoryProducts("nope")` rejects `NotFoundError`.
  - `search("jacket")` → ids `["3","15","16","17"]`; `search("JACKET")` equals `search("jacket")`.
  - `search("(")` → resolves (no throw); `search("zzzz-no-match")` → `[]`.
  - `search("jewelery")` returns all 4 jewelery products (matches category name).
  - `getProduct("1")` → title starts `"Fjallraven"`; `getProduct("999")` rejects `NotFoundError`.
- [ ] **Step 3: Failing route tests** (`buildTestApp()`):
  - `GET /api/categories` → 200, 4 items, includes `{ slug: "mens-clothing", name: "men's clothing" }`.
  - `GET /api/products/featured` → 200, length 5.
  - `GET /api/categories/electronics/products` → 200 with `category.slug`, `topRated`, `others`.
  - `GET /api/categories/nope/products` → 404 `NOT_FOUND`.
  - `GET /api/products?q=%20%20jacket%20` → 200 non-empty (trimmed).
  - `GET /api/products?q=%20` and `GET /api/products` → 400 `VALIDATION_ERROR`.
  - `GET /api/products?q=` + 201-char term → 400.
  - `GET /api/products/1` → 200; `/api/products/999` → 404.
  - catalogue whose `getCatalogue` rejects with `UpstreamError` → `GET /api/products/featured` 502 `UPSTREAM_UNAVAILABLE`.
  - `JsonFeaturedProducts` on file with `{ "home": "x" }` → rejects with error naming the file.
- [ ] **Step 4:** Run → FAIL.
- [ ] **Step 5: Implement.** Query schema: `z.object({ q: z.string().trim().min(1).max(200) })`. Search: lowercase substring (`String.prototype.includes`, never `RegExp`) against `title`, `description`, category display name. Fallback sort: `rating.average` desc, then `rating.count` desc.
- [ ] **Step 6:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 7: Commit** `feat(api): catalogue service with curated featured products, category split and search`.

### Task 4: Enquiries (validation, email, notifier, rate limit)

**Files:**
- Create: `api/src/services/{enquiryService.ts,enquiryEmail.ts}`, `api/src/adapters/smtpEnquiryNotifier.ts`, `api/src/http/enquiryRoutes.ts`; modify `api/src/app.ts`
- Test: `api/test/services/{enquiryService,enquiryEmail}.test.ts`, `api/test/http/enquiryRoutes.test.ts`, `api/test/adapters/smtpEnquiryNotifier.test.ts`

**Interfaces — Produces:**
```ts
export const enquirySchema: z.ZodType<Enquiry>   // in enquiryRoutes.ts
export function formatEnquiryEmail(enquiry: Enquiry, product: Product): { subject: string; text: string }
export class EnquiryService { constructor(catalog: CatalogService, notifier: EnquiryNotifier); submit(enquiry: Enquiry): Promise<void> }  // NotFoundError; wraps notifier failure in NotificationError (logs cause)
export class SmtpEnquiryNotifier implements EnquiryNotifier { constructor(opts: { transport: Pick<Transporter, 'sendMail'>; from: string; to: string }) }
export function createSmtpTransport(smtp: Config['smtp']): Transporter
```
Schema (zod 4):
```ts
z.strictObject({
  productId: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100).regex(/^[^\p{Cc}]*$/u, 'Name contains invalid characters'),
  email: z.email().max(254),
  phone: z.string().trim().max(30).regex(/^[0-9 +()-]*$/, 'Invalid phone number').optional(),
  message: z.string().trim().max(1000).optional(),
})
```
Route: `POST /api/enquiries` → 202 `{ status: "received" }`, guarded by `rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, handler: → 429 RATE_LIMITED })`, default `{ windowMs: 60_000, limit: 5 }`.

- [ ] **Step 1: Failing tests:**
  - `formatEnquiryEmail`: subject `"New enquiry: Mens Cotton Jacket"`; text contains name, email, phone, message, product id, title and `$55.99` (en-AU AUD); product title containing `\r\n` is collapsed to a space in subject; missing phone/message render as `"-"`.
  - `SmtpEnquiryNotifier.notify` with fake transport: `sendMail` called with `{ from, to, replyTo: enquiry.email, subject, text }` and no `html` key.
  - `EnquiryService.submit`: unknown product → `NotFoundError`, notifier not called; notifier throws → `NotificationError`; success → notifier called once with `(enquiry, product)`.
  - Routes (`buildTestApp`): valid body `{ productId: "3", name: "Ada", email: "ada@example.com" }` → 202 `{ status: "received" }` and notifier recorded 1 call; missing name → 400 with `details[0].path === "name"`; email `"nope"` → 400; extra field `{ admin: true }` → 400; name `"Bob\r\nBcc: x@y.z"` → 400; productId `"999"` → 404; notifier `fail = true` → 502 `NOTIFICATION_FAILED`; with `enquiryRateLimit: { windowMs: 60000, limit: 2 }` third request → 429 `RATE_LIMITED`; 11kb body → 413.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** `createSmtpTransport` → `nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined })`.
- [ ] **Step 4:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): enquiry endpoint with validation, plain-text email and rate limiting`.

### Task 5: Composition root, API container, compose with Mailpit

**Files:**
- Create: `api/src/server.ts`, `api/Dockerfile`, `api/.dockerignore`, `docker-compose.yml`, `.env.example`

- [ ] **Step 1: `server.ts`**: `loadConfig(process.env)` (on error print message, `process.exit(1)`); catalogue = `PRODUCT_SOURCE === 'fixture' ? new FixtureCatalog('fixtures/products.json') : new FakeStoreCatalog({ baseUrl })`, wrapped in `CachedCatalog(ttl*1000)`; `JsonFeaturedProducts(featuredConfigPath)`; `SmtpEnquiryNotifier({ transport: createSmtpTransport(smtp), from: mailFrom, to: salesInboxEmail })`; `createApp(...)`; `listen(port)`; log `API listening on :<port> (source=<productSource>)`; SIGTERM → `server.close()`. Paths resolved relative to `process.cwd()` (= `api/`).
- [ ] **Step 2: Dockerfile** multi-stage on `node:22-alpine`: `build` stage `npm ci` + `npm run build`; runtime stage `npm ci --omit=dev`, copy `dist/`, `config/`, `fixtures/`; `ENV NODE_ENV=production`; `USER node`; `EXPOSE 3001`; `CMD ["node","dist/server.js"]`. `.dockerignore`: `node_modules dist test coverage`.
- [ ] **Step 3: `docker-compose.yml`**: services `mailpit` (`axllent/mailpit:v1.27`, ports `8025:8025`, `1025:1025`), `api` (build `./api`, env: `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, `PRODUCT_SOURCE=${PRODUCT_SOURCE:-fakestore}`, `SALES_INBOX_EMAIL=${SALES_INBOX_EMAIL:-sales@example.com}`, `MAIL_FROM=${MAIL_FROM:-catalogue@example.com}`; healthcheck `wget -qO- http://localhost:3001/api/health`; depends_on mailpit). `web` service added in Task 9.
- [ ] **Step 4: `.env.example`**: every var from `Config` with default value and one-line comment; note compose reads it via `${VAR:-default}` and `.env` is optional.
- [ ] **Step 5: Verify:** `docker compose up --build -d api mailpit`; `docker compose exec api wget -qO- http://localhost:3001/api/products/featured` → 5 products; `docker compose exec api wget -qO- --header 'Content-Type: application/json' --post-data '{"productId":"3","name":"Ada","email":"ada@example.com"}' http://localhost:3001/api/enquiries` → `{"status":"received"}`; `curl -s http://localhost:8025/api/v1/messages | grep -o '"Subject":"[^"]*"'` → `"Subject":"New enquiry: Mens Cotton Jacket"`. Repeat featured call with `PRODUCT_SOURCE=fixture docker compose up -d api`. `docker compose down`.
- [ ] **Step 6: Commit** `feat: api composition root, container and compose with mailpit`.

### Task 6: Web skeleton (Vite, Tailwind, router, API client, layout)

**Files:**
- Create: `web/` via `npm create vite@latest web -- --template react-ts` then trim boilerplate; `web/src/{index.css,App.tsx,main.tsx}`, `web/src/api/{types.ts,client.ts,useApi.ts}`, `web/src/lib/formatPrice.ts`, `web/src/components/{Layout,SearchBar,CategoryNav,StatusMessage}.tsx`, `web/src/test/{setup.ts,fixtures.ts}`
- Test: `web/src/api/client.test.ts`, `web/src/components/SearchBar.test.tsx`, `web/src/components/CategoryNav.test.tsx`

**Interfaces — Produces:**
```ts
// api/types.ts — mirrors api domain + CategoryProducts + ApiErrorBody, EnquiryInput (= Enquiry)
// api/client.ts
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) }
export const api = {
  getCategories(): Promise<Category[]>, getFeatured(): Promise<Product[]>,
  getCategoryProducts(slug: string): Promise<CategoryProducts>, searchProducts(q: string): Promise<Product[]>,
  getProduct(id: string): Promise<Product>, submitEnquiry(input: EnquiryInput): Promise<void>,
}
// api/useApi.ts
export type ApiState<T> = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'success'; data: T }
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): ApiState<T>   // ignores stale responses on deps change/unmount
// lib/formatPrice.ts
export function formatPrice(n: number): string  // en-AU AUD
// components
export function StatusMessage(props: { kind: 'loading' | 'error' | 'empty'; message?: string }): JSX.Element  // error uses role="alert"
// test/fixtures.ts
export const products: Product[]; export const categories: Category[]   // small hand-written set (4–6 products)
```

- [ ] **Step 1: Scaffold + deps:** `npm i react-router`; `npm i -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`. `vite.config.ts`: plugins `react()`, `tailwindcss()`; `server.proxy['/api'] = 'http://localhost:3001'`; `test: { environment: 'jsdom', setupFiles: 'src/test/setup.ts', globals: true }`. Scripts: `test: vitest run`, `typecheck: tsc -b --noEmit` (adjust to template). `index.css`: `@import "tailwindcss";` + `@theme { --color-brand, --color-brand-ink, --color-ink, --color-ink-muted, --color-surface, --color-line, --font-sans, --radius-card }`.
- [ ] **Step 2: Failing tests:**
  - `client.test.ts` (stub `global.fetch`): `searchProducts("men's shirt")` requests `/api/products?q=men's%20shirt` (URL-encoded via `URLSearchParams`); non-2xx with error body → rejects `ApiError` with `status` 404 and `code` `"NOT_FOUND"`; non-JSON 502 body (e.g. nginx HTML) → `ApiError` with `status` 502 and `code` `"UNKNOWN"`; `submitEnquiry` POSTs JSON with `Content-Type: application/json`.
  - `SearchBar.test.tsx`: Search button disabled when input blank/whitespace; typing `" jacket "` + click → navigates to `/search?q=jacket`; pressing Enter submits too; when mounted at `/search?q=bag` the input shows `bag`.
  - `CategoryNav.test.tsx` (mock `api.getCategories`): renders link `men's clothing` with `href="/category/mens-clothing"`.
- [ ] **Step 3:** Run `cd web && npm test` → FAIL.
- [ ] **Step 4: Implement.** `Layout`: header (brand link `/`, `SearchBar`, `CategoryNav`), `<main>` with `<Outlet/>`. `App.tsx`: `createBrowserRouter` / `<Routes>` for `/`, `/category/:slug`, `/search`, `/products/:id`, `*` → NotFoundPage (pages stubbed as placeholders now, filled in Task 7).
- [ ] **Step 5:** `npm test && npm run typecheck && npm run build` → PASS.
- [ ] **Step 6: Commit** `feat(web): vite react app with tailwind tokens, router, api client and layout`.

### Task 7: Web pages (home, category, search, product)

**Files:**
- Create: `web/src/components/{ProductTile,ProductGrid}.tsx`, `web/src/pages/{HomePage,CategoryPage,SearchPage,ProductPage,NotFoundPage}.tsx`
- Test: `web/src/pages/{HomePage,CategoryPage,SearchPage,ProductPage}.test.tsx`

**Interfaces — Produces:**
```ts
export function ProductTile(props: { product: Product }): JSX.Element   // whole tile is <Link to={`/products/${id}`}>, image alt = title, shows title + formatPrice
export function ProductGrid(props: { products: Product[] }): JSX.Element // <ul> responsive grid
```
Page copy: Home heading `"Top rated"`; Category headings `"Top rated in <name>"` and `"More in <name>"`; Search heading `Results for "<q>"`, empty `No products match "<q>".`; Product page shows image, title, price, category name, description, rating `★ 4.7 (500 reviews)`, button `"Enquire"` (form wired in Task 8, render placeholder slot). 404 API error → `"Product not found"` / `"Category not found"` via `StatusMessage kind="empty"`; other errors → `StatusMessage kind="error"` `"Something went wrong loading products. Please try again."`.

- [ ] **Step 1: Failing tests** (mock `api` module with `vi.mock('../api/client')`, render inside `MemoryRouter` + routes):
  - Home: shows heading "Top rated" and exactly as many tiles as `getFeatured` returns (5); first tile link `href="/products/<id>"`; `getFeatured` rejecting `ApiError(502,…)` → `role="alert"` with "Something went wrong".
  - Category `/category/electronics`: both sections render with their products; `others` empty → "More in electronics" section hidden; `ApiError(404)` → "Category not found".
  - Search `/search?q=jacket`: calls `searchProducts("jacket")`, renders only returned products; `[]` → `No products match "jacket".`
  - Product `/products/3`: title, formatted price `$55.99` (en-AU renders `$55.99`), "Enquire" button; `ApiError(404)` → "Product not found".
  - Clicking a tile on Home navigates to the product page (route renders ProductPage with mocked `getProduct`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** pages with `useApi`; category display name from response `category.name`; keep styling to token utilities, responsive grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, images `object-contain` fixed aspect.
- [ ] **Step 4:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): home, category, search and product pages`.

### Task 8: Enquiry form + thank you

**Files:**
- Create: `web/src/components/EnquiryForm.tsx`; modify `web/src/pages/ProductPage.tsx`
- Test: `web/src/components/EnquiryForm.test.tsx`

**Interfaces — Produces:**
```ts
export function EnquiryForm(props: { productId: string; productTitle: string }): JSX.Element
```
Behaviour: ProductPage "Enquire" toggles the form (button gets `aria-expanded`). Fields: Name (required), Email (required, `type="email"`), Phone (optional), Message (optional), button "Send enquiry". Client checks: required + basic email format → inline messages, no request. On submit: disable button + label "Sending…"; success → replace form with heading **"Thank you"** and text `We've received your enquiry about <title>. Our sales team will be in touch soon.`; `ApiError` 400 → show server `details` messages; other errors → `role="alert"` `"Sorry, we couldn't send your enquiry. Please try again."`, inputs kept. Empty optional fields omitted from payload (server is strict).

- [ ] **Step 1: Failing tests** (`user-event`, mock `api.submitEnquiry`):
  - fill name "Ada", email "ada@example.com", click Send → `submitEnquiry` called with `{ productId: "3", name: "Ada", email: "ada@example.com" }` (no phone/message keys) → "Thank you" heading visible, form gone.
  - empty name → "Name is required", `submitEnquiry` not called; email "nope" → "Enter a valid email address".
  - `submitEnquiry` pending: double-click Send → called once; button disabled showing "Sending…".
  - rejects `ApiError(502, 'NOTIFICATION_FAILED')` → alert shown, no "Thank you", name input still "Ada".
  - ProductPage: "Enquire" click reveals form (`aria-expanded="true"`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): enquiry form with thank-you confirmation`.

### Task 9: Web container + full-stack run

**Files:** Create `web/Dockerfile`, `web/nginx.conf`, `web/.dockerignore`; modify `docker-compose.yml`.

- [ ] **Step 1:** Dockerfile: `node:22-alpine` build (`npm ci`, `npm run build`) → `nginx:1.27-alpine` serving `/usr/share/nginx/html`. `nginx.conf`: `location /api/ { proxy_pass http://api:3001; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header Host $host; }`, `location / { try_files $uri /index.html; }`, gzip on.
- [ ] **Step 2:** Compose `web`: build `./web`, ports `8080:80`, `depends_on: api: condition: service_healthy`.
- [ ] **Step 3: Verify** from clean state: `docker compose down -v && docker compose up --build`. In browser at `http://localhost:8080`: home shows 5 tiles; click "men's clothing" → top rated 3 + 1 more; search "jacket" → only jackets; click tile → details; Enquire → submit → "Thank you"; `http://localhost:8025` shows "New enquiry: …" with reply-to customer. Deep-link refresh on `/products/3` works (nginx fallback). Time the cold start (target < 10 min incl. build).
- [ ] **Step 4: Commit** `feat: web container and one-command docker compose stack`.

### Task 10: CI

**Files:** Create `.github/workflows/ci.yml`.

- [ ] **Step 1:** On `pull_request` + `push` to `main`: matrix `app: [api, web]`, `actions/setup-node` Node 22 with npm cache keyed on `${{ matrix.app }}/package-lock.json`, `working-directory: ${{ matrix.app }}`: `npm ci`, `npm run typecheck`, `npm test`; web also `npm run build`.
- [ ] **Step 2: Commit** `ci: typecheck and test api and web`.

### Task 11: Submission docs

**Files:** Create/replace `README.md`, `DECISIONS.md`, `AI_USAGE.md`; update `CLAUDE.md` if conventions drifted.

- [ ] **Step 1: README:** what it is; stack choice + why (React+Vite TS / Express TS, candidate choice: familiarity for live changes, both "preferred TS" options); prerequisites (Docker Desktop; Node 22+ only for running without Docker); quick start `docker compose up --build` → app `:8080`, inbox `:8025`; config table from `.env.example`; switch to fixture data `PRODUCT_SOURCE=fixture docker compose up --build`; change featured products (`api/config/featured.json`, no restart); run tests per app; dev mode without Docker; project structure; API endpoint table.
- [ ] **Step 2: DECISIONS.md** sections: Assumptions (curated featured; category top-rated rule; search fields + button-only; enquiry fields; AUD; no enquiry persistence; Fake Store "jewelery" spelling kept as display name); Dropped/simplified + why (persistence, admin UI, pagination, e2e, auth, real email provider, IaC; plus any cut from the cut order); Growth path (ports/adapters per change axis: data source, email provider, look & feel tokens; featured config → CMS/DB; contract drift → OpenAPI-generated types; AWS: containers → ECS/App Runner, SES via SMTP or adapter, Secrets Manager for SMTP creds); Approaches considered (A/B/C table from spec, B chosen by candidate); Next day (Playwright e2e in CI, OpenAPI + generated client, persist enquiries + outbox/queue for reliable email, observability, accessibility audit, image optimisation/CDN).
- [ ] **Step 3: AI_USAGE.md** draft from this session: tools/models (Claude Code, Claude Opus 5.5, superpowers brainstorming + writing-plans + execution skills, builder-check subagent; ChatGPT — **ask candidate what for**); agent instruction file `CLAUDE.md`; plan/spec paths; 3–5 key moments (stack choice; candidate overrode AI's pick A with B; builder-check caught category names leaking Fake Store naming into URLs → slugs + fixture adapter; candidate swapped plain CSS tokens for Tailwind; any execution-time catches); "where the AI got it wrong" (fill with real catches from review/test failures during build — do not invent). Leave **Time spent** section with placeholders for candidate to fill.
- [ ] **Step 4:** Candidate reviews and edits all three docs.
- [ ] **Step 5: Commit** `docs: readme, decisions and ai usage notes`.

### Task 12: Publish (needs candidate go-ahead — outward-facing)

- [ ] **Step 1:** Final check from clean clone: `git clone . /tmp/x && cd /tmp/x && docker compose up --build` works; both apps `npm test` pass.
- [ ] **Step 2:** With candidate approval: `gh repo create <name> --public --source . --remote origin`; `git push -u origin main`; `git push -u origin feat/product-catalogue-poc`.
- [ ] **Step 3:** `gh pr create --base main --head feat/product-catalogue-poc` with description: summary, how to run, AC → implementation/test mapping table, key decisions + assumptions (link DECISIONS.md), what was cut, test evidence (counts), AI usage summary (link AI_USAGE.md), time spent; ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Leave PR open. Confirm CI green.
