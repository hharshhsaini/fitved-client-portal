# Testing Patterns

**Analysis Date:** 2026-07-30

## Current State: Test Infrastructure Exists, No Real Tests

Be honest about this when planning work: **the test harness is wired up (Vitest + Testing Library + jsdom are installed and configured), but the codebase has exactly one placeholder test file and zero tests covering actual application code.**

```
src/test/example.test.ts   <- the ONLY test file in the entire repo
src/test/setup.ts          <- jest-dom + matchMedia polyfill, referenced by vitest.config.ts
```

`src/test/example.test.ts` in full:
```ts
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

There are no `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files anywhere under `src/`. No component, hook, context, or `src/lib/*` utility (e.g. `dates.ts`, `incomeAllocation.ts`, `sessionPlan.ts`, `trainerSessions.ts`, `phoneAuth.ts`) has a corresponding test. `AuthContext.tsx` — the most complex, highest-risk file in the codebase (custom localStorage auth + Firebase + Supabase branching logic) — has no tests at all.

**Do not assume tests exist for any feature area when planning changes.** If a phase plan calls for "update tests," it means writing them from scratch, not modifying existing coverage.

## Test Framework

**Runner:**
- Vitest `^3.2.4`
- Config: `vitest.config.ts` (repo root)

**Config contents (`vitest.config.ts`):**
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```
- `environment: "jsdom"` — DOM APIs available (`jsdom` is a devDependency)
- `globals: true` — `describe`/`it`/`expect` available without importing (though the one existing test still imports them explicitly)
- `@` path alias mirrors the app's `tsconfig`/Vite alias, so tests can `import { x } from "@/lib/x"`

**Assertion Library:**
- Vitest's built-in `expect` (Chai/Jest-compatible API)
- `@testing-library/jest-dom` matchers are loaded globally via `src/test/setup.ts` (`import "@testing-library/jest-dom"`), so `toBeInTheDocument()` etc. are available if/when component tests are written, but no test currently uses them.

**React Testing:**
- `@testing-library/react` `^16.0.0` is installed but **not yet used anywhere** — no `render()` call exists in the repo.

**Run Commands:**
```bash
npm test          # `vitest run` — single run, e.g. for CI
npm run test:watch # `vitest` — watch mode
```
There is no `test:coverage` script and no `@vitest/coverage-*` package installed — coverage is not currently measurable without adding a coverage provider.

## Test File Organization

**Location:** Single centralized `src/test/` directory holds the placeholder test and the shared setup file. No co-located `*.test.tsx` next to components exists yet, so there is no established co-location convention to follow — either co-locating (`Component.test.tsx` beside `Component.tsx`) or centralizing further under `src/test/` are both viable; neither is currently enforced.

**Naming:** The Vitest `include` glob (`src/**/*.{test,spec}.{ts,tsx}`) accepts both `.test.` and `.spec.` naming — the one existing file uses `.test.ts`. Prefer `.test.ts`/`.test.tsx` to match the existing (if minimal) precedent.

## Test Structure

**Suite Organization (only existing example):**
```ts
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```
No richer pattern (nested `describe`, `beforeEach`/`afterEach`, fixtures) exists yet to reference — any new test suite is establishing precedent, not following one.

## Mocking

**Framework:** Vitest's built-in `vi` mocking API is available (bundled with `vitest`) but unused — no `vi.mock(...)`, `vi.fn()`, or `vi.spyOn(...)` calls exist anywhere in the repo.

**Supabase/Firebase mocking:** No mock client, MSW handler, or test double exists for `@/integrations/supabase/client` or `@/integrations/firebase/client`. Any test that exercises code calling `supabase.from(...)` or Firebase auth functions will need its own mock — there is no existing pattern to copy.

**What to Mock (recommendation, not existing convention):** Given the codebase's heavy reliance on live Supabase/Firebase calls inside hooks and mutation functions (see `CONVENTIONS.md`), unit tests for hooks/components will need to mock `@/integrations/supabase/client`'s `supabase` export and `@/integrations/firebase/client`'s `firebaseAuth`/`googleProvider` exports at the module level (`vi.mock("@/integrations/supabase/client", ...)`), since these are singletons instantiated at import time.

## Fixtures and Factories

None exist. No `src/test/fixtures/`, `src/test/factories/`, or seed-data helpers were found.

## Coverage

**Requirements:** None enforced. No coverage tool installed, no CI coverage gate found (no `.github/workflows/` was found in this repo at all — see CI note below).

**View Coverage:** Not currently possible without first adding `@vitest/coverage-v8` (or similar) and a `coverage` script.

## CI / Automated Test Execution

No `.github/workflows/` directory exists in this repo, so `npm test` is not currently wired into any CI pipeline found in-repo. Deployment appears to go through Vercel (`vercel.json` present) — check Vercel project settings (outside this repo) for whether `npm test` runs as part of the build; based on `package.json` scripts alone, `vercel-build`/`build` only runs `node scripts/generate-booking-config.js && vite build`, which does **not** invoke `vitest`.

## Type Checking as a Quality Gate

In the absence of real test coverage, the closest thing to an automated correctness check is:
```bash
npx tsc --noEmit -p tsconfig.app.json   # typecheck src/ (currently passes clean)
npm run build                            # node scripts/generate-booking-config.js && vite build
npm run lint                             # eslint .
```
Given `tsconfig.app.json` has `"strict": false`, `"noImplicitAny": false`, and `"strictNullChecks": false` (see `CONVENTIONS.md`), a clean `tsc --noEmit` run provides much weaker guarantees than in a strict-mode project — it will not catch null/undefined mismatches or implicit `any` misuse. Treat `tsc --noEmit` and `eslint` as syntax/basic-type gates, not correctness gates, when deciding whether a change is safe.

## Recommendations for New Test Work

Since there is no existing real-test pattern to mirror, any phase that requires "add tests" should:
1. Start with pure functions in `src/lib/*.ts` (`dates.ts`, `incomeAllocation.ts`, `sessionPlan.ts`, `trainerSessions.ts`, `phoneAuth.ts`) — these have no Supabase/Firebase dependency and are the cheapest to test in isolation.
2. For hooks/components touching Supabase (`useProfile.ts`, most of `src/components/admin/customer-tabs/*`), mock `@/integrations/supabase/client` at the module boundary before rendering.
3. Use `@testing-library/react`'s `render`/`screen` (already installed) plus a `QueryClientProvider` wrapper (since nearly everything uses TanStack Query) — no existing wrapper utility exists yet, so one will need to be created, e.g. `src/test/utils.tsx` with a `renderWithProviders` helper.
4. Follow the `.test.ts`/`.test.tsx` naming already accepted by `vitest.config.ts`'s `include` glob.

---

*Testing analysis: 2026-07-30*
