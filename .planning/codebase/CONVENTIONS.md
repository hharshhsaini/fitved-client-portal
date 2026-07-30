# Coding Conventions

**Analysis Date:** 2026-07-30

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` — e.g. `src/components/trainer/TrainerProfileForm.tsx`, `src/pages/admin/Trainers.tsx`, `src/contexts/AuthContext.tsx`
- shadcn/ui primitives: `kebab-case.tsx` under `src/components/ui/` — e.g. `src/components/ui/alert-dialog.tsx`, `src/components/ui/dropdown-menu.tsx` (these files still export PascalCase components; only the filename is kebab-case, matching shadcn's own convention)
- Hooks: `use-kebab-case.tsx`/`.ts` or `useCamelCase.ts` (both exist) — e.g. `src/hooks/use-mobile.tsx`, `src/hooks/use-toast.ts`, `src/hooks/useProfile.ts`
- Library/utility modules: `camelCase.ts` under `src/lib/` — e.g. `src/lib/incomeAllocation.ts`, `src/lib/sessionPlan.ts`, `src/lib/trainerSessions.ts`, `src/lib/phoneAuth.ts`, `src/lib/specializations.ts`
- Store modules: `camelCase.tsx` under `src/stores/` — e.g. `src/stores/pauseStore.tsx`

**Directories:**
- Feature grouping under `src/components/`: `admin/`, `admin/customer-tabs/`, `dashboard/`, `plan/`, `trainer/`, `ui/`
- Route-aligned grouping under `src/pages/`: flat marketing/customer pages at top level, `pages/admin/` for admin-only screens

**Functions:**
- `camelCase` for all functions and hooks (`normalizePhone`, `recalculatePlanDates`, `formatDate`, `useReveal`)
- Custom hooks always prefixed `use` (`useProfile`, `useAuth`, `useReveal`, `useIsMobile`)

**Variables:**
- `camelCase` for local state and variables (`serviceAreas`, `photoDeleted`, `cvFile`)
- `SCREAMING_SNAKE_CASE` for module-level constants/config objects — e.g. `NAV_DROPDOWNS`, `SPECIALIZATIONS` (`src/lib/specializations.ts`), `leadSchema` is the exception (schema objects stay camelCase)

**Types:**
- `PascalCase` for types/interfaces, no `I` prefix — e.g. `interface AuthContextValue`, `type AppRole = "client" | "trainer" | "admin"`, `type CertRow`, `type Seed`
- Union-of-string-literals preferred over enums for role/status fields (`"client" | "trainer" | "admin"`)

## Code Style

**Formatting:**
- No Prettier config present (`.prettierrc*` not found) — formatting is whatever the editor/eslint produces; double quotes are used consistently by convention (not enforced by a rule)
- No `noUnusedLocals`/`noUnusedParameters`/`noImplicitAny` enforcement — see TypeScript strictness below

**Linting:**
- `eslint.config.js` (flat config, ESLint 9 + typescript-eslint 8)
- Extends `js.configs.recommended` and `tseslint.configs.recommended`
- `react-hooks` recommended rules enabled (exhaustive-deps etc. at whatever the plugin's recommended level sets)
- `react-refresh/only-export-components` set to `"warn"` (allows constant exports, e.g. shadcn's `buttonVariants`)
- **`@typescript-eslint/no-unused-vars` is explicitly turned OFF** — unused vars/params will not fail lint or CI
- Run: `npm run lint` (`eslint .`)

**TypeScript strictness (important — check before assuming strict typing):**
- `tsconfig.app.json` (the config that actually covers `src/`) sets:
  - `"strict": false`
  - `"noImplicitAny": false`
  - `"strictNullChecks": false`
  - `"noUnusedLocals": false`, `"noUnusedParameters": false`
  - `"noFallthroughCasesInSwitch": false`
- This is a **loose/non-strict TypeScript setup**. Do not assume null-safety or exhaustive type-checking will catch mistakes — `any` and implicit nulls pass silently.
- Casts to `any` are a normal, accepted pattern in this codebase (not a code smell to eliminate), most commonly `(supabase as any)` or `supabase.from(x) as any` — see Supabase section below.
- Typecheck command: `npx tsc --noEmit -p tsconfig.app.json` (currently passes clean with 0 errors as of this analysis)
- Build command: `npm run build` — note this first runs `node scripts/generate-booking-config.js` (a prebuild step reading `process.env`) before `vite build`

## Import Organization

**Order (observed convention, not enforced by tooling):**
1. React and framework imports (`react`, `react-router-dom`)
2. Third-party data/query libs (`@tanstack/react-query`, `date-fns`, `zod`)
3. Internal integration clients (`@/integrations/supabase/client`, `@/integrations/firebase/client`)
4. Internal stores/lib helpers (`@/stores/...`, `@/lib/...`)
5. UI components, grouped by shadcn primitive (`@/components/ui/*`)
6. Icons (`lucide-react`)
7. Cross-cutting utilities (`sonner` toast)
8. Local feature components (`@/components/admin/...`)

Example (`src/pages/admin/Trainers.tsx`):
```ts
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { firebaseAuth } from "@/integrations/firebase/client";
import { createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { recalculatePlanDates } from "@/stores/pauseStore";
import { trainerSessionsForMonth, recentMonthKeys, monthLabel } from "@/lib/trainerSessions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// ...more @/components/ui/*
import { Plus, Pencil, Trash2 /* ... */ } from "lucide-react";
import { toast } from "sonner";
import TrainerReviewDialog from "@/components/admin/TrainerReviewDialog";
import { SPECIALIZATIONS } from "@/lib/specializations";
```

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, and `components.json`)
- Always import via `@/...`, never relative `../../` chains across feature folders

## Supabase Query Pattern (critical, project-specific)

**Generated types lag behind live migrations.** The codebase works around this with an `any` cast rather than regenerating types:
```ts
const { data } = await (supabase as any)
  .from("trainer_off_times")
  .select("id, trainer_id, from_date, to_date, time_slot, reason")
  .gte("to_date", today);
```
or equivalently `(supabase.from("pauses") as any).select(...)`.

**When to use the cast:** any table/column not present in `src/integrations/supabase/types.ts` (the generated types file). Tables observed needing the cast: `trainer_off_times`, `comp_classes`, `trainer_session_adjustments`, `pauses`. Well-typed tables (`profiles`, `admins`, `trainers`, `user_roles`) are queried without the cast.

**Insert/update payloads** for tables where the generated type is stale also get cast at the call site, e.g. `} as never)` (see `src/contexts/AuthContext.tsx:93,96`) or `as any` — pick whichever silences the specific TS error at that call site; both patterns appear.

**Standard read (TanStack Query):**
```ts
const { data: pauses = [] } = useQuery({
  queryKey: ["customer-pauses", userId],
  queryFn: async () => {
    const { data } = await (supabase.from("pauses") as any).select("*").eq("client_id", userId)
      .order("from_date", { ascending: false });
    return data ?? [];
  },
});
```
- `queryKey` is an array starting with a descriptive string, followed by the id(s) it's scoped to.
- Default to `data ?? []` / `data ?? null` fallback rather than leaving `undefined`.
- Use `enabled: !!user` (or similar) to gate queries on auth/session readiness (`src/hooks/useProfile.ts`).
- Use `.maybeSingle()` for "may or may not exist" lookups; `.single()` only when existence is guaranteed.

**Standard write (TanStack Mutation):**
```ts
const create = useMutation({
  mutationFn: async () => {
    if (from > to) throw new Error("From date must be on or before To date");
    const { error } = await (supabase.from("pauses") as any).insert({ ... });
    if (error) throw error;
    await recalculatePlanDates(userId); // side-effect / derived-state recalculation
  },
  onSuccess: () => {
    toast.success("Pause added");
    invalidatePauses(); // helper invalidating every related queryKey
  },
  onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
});
```
- Validate input inside `mutationFn` by throwing `new Error("message")` — this message becomes the toast text in `onError`.
- Supabase errors are checked explicitly (`if (error) throw error`) rather than relying on `.throwOnError()`.
- A dedicated `invalidate*` helper function fans out `queryClient.invalidateQueries` calls across every queryKey that could be affected by the mutation (see `PausesTab.tsx`'s `invalidatePauses`). Follow this pattern instead of invalidating ad hoc inline.

**Batched reads:** `Promise.all([...])` with multiple `(supabase as any).from(...).select(...)` calls when a component needs several related tables at once (`src/pages/admin/Trainers.tsx`).

## Toast Notifications (sonner)

- Import: `import { toast } from "sonner"` — never the shadcn `use-toast` hook/Radix Toast for new code (that hook exists in `src/hooks/use-toast.ts` for legacy/shadcn compatibility only; prefer `sonner` for anything new).
- `toast.success("...")` for mutation success, `toast.error("...")` for failures, `toast.info("...")` for neutral notices (e.g. "Redirecting to Google…").
- Error toast pattern: `onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")` — always narrow `unknown`/`Error` before reading `.message`.

## Error Handling

**Patterns:**
- Supabase calls: destructure `{ data, error }`, check `if (error) throw error` (queries/mutations) or `if (error) return { error: error.message }` (auth-style functions that return a result object instead of throwing).
- Auth flows in `src/contexts/AuthContext.tsx` never throw across the public API — every method returns `{ error: string | null }` (optionally `notice?: string`), and callers branch on `error`. This is deliberate so calling UI code doesn't need try/catch for expected failure paths (wrong password, existing account, etc.).
- Third-party SDK errors (Firebase) are narrowed via `(e as { code?: string })?.code` and mapped to specific human-readable messages per Firebase error code (see the long `if (code === "auth/...")` chains in `AuthContext.tsx`) — follow this pattern when adding new Firebase auth flows rather than surfacing raw SDK error text.
- Non-critical failures are swallowed with a comment explaining why, e.g. `console.warn("user_roles insert failed:", roleError.message); // Don't block login — role can be re-linked later`.
- No app-wide `ErrorBoundary` component exists. No centralized error/logging service is wired in (no Sentry/LogRocket etc. found).

## Comments

**When to Comment:**
- Comments are used liberally to explain **why**, especially around non-obvious auth/state decisions (custom localStorage auth vs Supabase Auth, why a cast is needed, why a query is invalidated). Follow this style — a short "why" comment above any workaround or cast.
- Section-divider comments using box-drawing characters appear in larger files, e.g.:
  ```ts
  /* ────────────────────────────────────────────────────────────────
     Scroll-reveal hook — triggers once per element as it enters view
  ──────────────────────────────────────────────────────────────────*/
  ```
  and `// ── Customer signup email verification (Firebase email link) ──` in `AuthContext.tsx`. Use these to delimit logical groups of related functions inside large files (`Trainers.tsx`, `AuthContext.tsx`, `Landing.tsx`).
- No JSDoc/TSDoc convention in use — comments are plain `//` or `/* */`.

## Function Design

**Size:** Files are frequently large (300–1000+ lines) with many colocated small handlers rather than being split into many small files — e.g. `src/pages/admin/Trainers.tsx`, `src/contexts/AuthContext.tsx`. When adding to an existing large page/context, follow the existing single-file-per-feature-area pattern rather than unilaterally splitting it up.

**Parameters:** Plain positional parameters for small helpers (`normalizePhone(phone)`); object-shaped params are not the default convention here (unlike some codebases) — check the specific function before assuming.

**Return Values:** Auth/mutation-adjacent async functions return a plain result object `{ error: string | null }` rather than throwing, so callers can `if (error) ...` without try/catch. Query/mutation functions (`queryFn`/`mutationFn`) throw on error instead, since TanStack Query expects that.

## Component Design

**Style:** Function components only, declared with `function Name(...)` (named function) or `export default function Name()` for pages — no class components anywhere in `src/`.

**State:** Plain `useState` per field is the dominant pattern for forms — e.g. `TrainerProfileForm.tsx` has 14+ separate `useState` calls rather than a single reducer or `react-hook-form` object. **`react-hook-form` and `zodResolver` are dependencies but are essentially unused** outside of the shadcn `src/components/ui/form.tsx` primitive itself — no page/component in the app currently calls `useForm()`. When building new forms, match the existing per-field `useState` + manual `zod` validation pattern (see `leadSchema` in `src/pages/Landing.tsx`) unless there's a specific reason to introduce `react-hook-form`.

**Validation:** `zod` schemas are declared as module-level constants (`const leadSchema = z.object({...})`) and parsed manually (not always wired through `zodResolver`) — e.g. `src/pages/Landing.tsx`.

**Memoization:** `useCallback` wraps most functions exposed through context value (`AuthContext.tsx`) to keep the `useMemo`-derived context value referentially stable. Apply this pattern for any new context provider.

## Module Design

**Exports:**
- Pages: `export default function PageName()`
- Reusable components/hooks/contexts: named exports (`export function AuthProvider`, `export function useAuth`, `export function PausesTab`)
- Library functions: named exports, no default exports in `src/lib/`

**Barrel Files:** Not used — no `index.ts` re-export barrels found under `src/components` or `src/lib`. Import directly from the specific file.

## FitVed Design System (Tailwind/shadcn)

- shadcn/ui configured via `components.json`: style `"default"`, base color `slate`, CSS variables enabled, no prefix, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
- All theme colors are HSL CSS variables defined in `src/index.css` (`--background`, `--primary`, `--accent`, etc.) and consumed through `tailwind.config.ts` `theme.extend.colors` (e.g. `primary: { DEFAULT: "hsl(var(--primary))" }`). Add new semantic colors this way, not as raw hex in components.
- Brand-specific flat hex utilities also exist directly in `tailwind.config.ts` outside the HSL-variable system: `fv-navy` (`#1E3A5F`), `fv-orange` (`#FF6B35` — note this is the actual current value; it does not match `#f0a720`, so check `tailwind.config.ts` directly before assuming a specific hex), `fv-neutral` (`#F5F5F5`), `fv-text` (`#333333`), `fv-success` (`#4CAF50`). Use `bg-fv-navy`, `text-fv-orange`, etc.
- Fonts: `font-display` → Fraunces (headings, `h1`–`h4` styled globally in `src/index.css` `@layer base`), `font-sans` → Outfit (body default). Both declared in `tailwind.config.ts` `fontFamily` and hardcoded again as the `body`/`h1-h4` `font-family` in `src/index.css` — keep both in sync when changing fonts.
- Custom utility classes and animations are added directly in `src/index.css` under `@layer utilities` (e.g. `.bg-gradient-brand`, `.shadow-soft`, `.fluid-container-hero`, `.fluid-section-m`) rather than only via Tailwind config — check `index.css` for existing fluid-spacing/gradient utilities before adding new ones.
- Dark mode variables exist (`.dark { ... }` block) via `darkMode: ["class"]`, but no in-app theme toggle was found wired to it (`next-themes` is a dependency, used at `src/components/ui/sidebar.tsx`-style low level only) — treat dark mode as scaffolded but not an active user-facing feature.

## Third-Party UI Kit

- `src/components/ui/` contains ~50 shadcn/ui generated primitives (button, dialog, form, table, select, calendar, chart, sidebar, etc.) — treat these as vendored/generated; prefer composing them rather than editing internals unless fixing a specific shadcn bug.
- Icons: `lucide-react` exclusively — no other icon library in use.

---

*Convention analysis: 2026-07-30*
