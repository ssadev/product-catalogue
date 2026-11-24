# AI usage

## Tools and models

- **Claude Code** (CLI) with **Claude Opus 5.5**: planning, design, implementation, tests, docs.
  - Used with the *superpowers* skill set: `brainstorming` (requirements → design), `writing-plans`
  (design → task plan), `executing-plans` + `test-driven-development` (build each task test-first),
  `verification-before-completion`.
  - A **fresh-context reviewer subagent** read the design doc before planning ("builder check"), and
  another reviewed the whole branch at the end.
  - Claude in Chrome to walk through the running app in a real browser.
- **ChatGPT**: summarising and clarifying concepts where I had doubts, and as a sounding board for
  brainstorming ideas alongside the Claude Code session.

## Agent instruction files

- [`CLAUDE.md`](CLAUDE.md): project rules for agents (boundaries, where adapters go, validation,
Tailwind tokens, TDD, run typecheck + tests before committing).

## Plan and spec

- Design spec: [`docs/superpowers/specs/2026-11-24-product-catalogue-design.md`](docs/superpowers/specs/2026-11-24-product-catalogue-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-11-24-product-catalogue-poc.md`](docs/superpowers/plans/2026-11-24-product-catalogue-poc.md)

Workflow: brief → AI restates the brief and raises constraints → I choose the stack → AI offers
approaches → I choose → AI writes the design → an independent reviewer questions it → I answer what
only I can → I approve → AI writes a task plan with exact test cases → AI builds task by task
(test first, one commit each) → browser check → whole-branch review → docs → PR.

## Key prompts and moments

1. **Handing over the brief, not a solution.** I gave Claude the PDF and the HR email and let it play
   the brief back first. It raised the deadline, the "no paid accounts" rule (which led to Mailpit
   instead of a real email provider), and the fact that I'd have to change the code live in the
   interview. That last point made stack familiarity the deciding factor.
2. **"React + Vite (TS) client, Node TS backend - Express."** I chose the stack I can defend and
   change quickly over anything novel.
3. **"B": overruling the AI's architecture pick.** Claude recommended a monorepo with a shared types
   package (A). I chose two independent apps (B): simpler builds and less tooling to explain, with
   contract drift as a known trade-off (recorded in DECISIONS.md, with OpenAPI as the next step).
4. **The independent review of the design.** A fresh subagent read the design as a builder would. It
   caught that the draft used Fake Store's raw category names (`men's clothing`) in URLs and config,
   which leaks the provider into our contract, the exact coupling the design said to avoid. Result:
   our own slugs, plus a fixture data source so the demo survives a Fake Store outage. I also set the
   cut order if time ran short (CI → rate limiting → fixture → web tests).
5. **"Look and feel: Use TailwindCSS."** I swapped the AI's plain-CSS proposal for Tailwind, keeping
   the design-token idea (`@theme` + semantic class names) so a rebrand stays a token change.

## Where the AI got it wrong, and how it was caught

| What went wrong | How it was caught | Fix |
|---|---|---|
| Design draft leaked Fake Store category names into URLs and config | Independent reviewer subagent on the design doc | Our own slugs, mapped in the Fake Store adapter |
| A test expectation in the plan had the wrong order for a rating tie (11 vs 12, both 4.8) | Checked the plan against the real Fake Store data before building | Expected order fixed to tie-break by review count |
| Lockfiles built with several `npm install` runs failed `npm ci` on Linux (missing optional `@emnapi/*` packages for a wasm binding) | The Docker build failed | Regenerated lockfiles from scratch; verified `npm ci` in a Linux container; moved images to Node 24 to match the local toolchain |
| `setState` called synchronously inside `useEffect` (data hook and search box) | `oxlint` (`react/set-state-in-effect`) | Derive state during render; tests unchanged and still green |
| Product tile images overflowed their square frame, giving uneven tiles; section headings were `capitalize`d, which would have changed the user's search term in "Results for …" | Browser walkthrough; unit tests passed because they don't render CSS | CSS fixed and checked again in the browser |
| The plan never set SMTP timeouts, so a silent mail server could hang an enquiry for minutes (nginx gives up at 60 s) and then still deliver, inviting a duplicate | Fresh-context whole-branch reviewer | 10 s connection/greeting/socket timeouts; test against a fake server that never greets |
| A 400 for a field the customer can't see (e.g. `productId`) left the form silently idle | Whole-branch reviewer | Only show errors for visible fields, otherwise show the general error; test added |
| A URL with malformed percent-encoding (`/api/products/%E0%A4%A`) returned 500 | Whole-branch reviewer (probed with supertest) | Express client errors map to 400; test added |
| A page test was ambiguous (the category link appears in both the header and the product) | Test failure | Scoped the assertion to the product article |

## Final review

A fresh reviewer (Claude Opus, no access to this conversation) reviewed the whole branch against
the spec and plan, ran the tests and probed edge cases. Verdict: no critical issues, "ready with
fixes". Fixed before the PR (each with a failing test first): SMTP timeouts, hidden-field server
errors in the enquiry form, and 500 on malformed URLs. Smaller findings I chose not to fix yet are
listed in the PR description (e.g. friendlier rate-limit message, encoding ids in links, validating
`featured.json` at startup, running lint in CI).

## Time spent

| Activity                                               | Time    |
| ------------------------------------------------------ | ------- |
| Reading the brief, planning and design (incl. ChatGPT) | 45 Mins |
| Building (API + web + Docker)                          | 1h      |
| Testing (automated + browser walkthrough)              | 1h      |
| Reviewing code and docs                                | 2h      |
| **Total**                                              | **4h 45m** |

For reference: the Claude Code session started at about 12:03 and all tasks were committed by 13:04
on 24 Nov 2026.
