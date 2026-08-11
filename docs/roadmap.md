# Roadmap

## Completed Features

- [x] Firebase Auth (Google Sign-In) with `AuthProvider` context
- [x] Sequence CRUD (create, read, update, delete)
- [x] Step CRUD (create, read, update, delete)
- [x] Drag-to-reorder steps in SequenceEditor (`@dnd-kit`)
- [x] Inline step editing within SequenceEditor
- [x] Step type picker modal (3 types)
- [x] Sequence run history display (read-only)
- [x] Active run indicator badges
- [x] Task list page (read-only, grouped by category)
- [x] Responsive layout (Sidebar desktop, BottomTabBar mobile)
- [x] Firestore timeout handling (10s wrapper)
- [x] Blank string stripping before Firestore writes
- [x] Google Picker integration (Drive Photos, Google Photos)
- [x] File drop input with drag-to-reorder images
- [x] Migration scripts (type normalization, step extraction, sequence normalization)

## In Progress / Partially Implemented

- [ ] `src/test/setup.ts` — Referenced in vitest config but **does not exist**. Must create before tests work.
- [ ] `src/counter.ts` — Orphaned Vite boilerplate. Should be deleted.

## Not Started (Stub Pages)

### High Priority
- [ ] **Notes** (`/notes`) — Read/write. List, detail/editor, create, soft-delete. Per `web.md` section 2.
- [ ] **Tasks improvements** — Add completed-tasks section, daily task templates view. Per `web.md` section 1.

### Medium Priority
- [ ] **Mood** (`/mood`) — Read-only. History list with emoji labels, optional summary chart (Recharts). Per `web.md` section 3.
- [ ] **Vitals** (`/vitals`) — Read-only. Health snapshots + food log totals per day. Per `web.md` section 4.
- [ ] **Food log editing** — Create/edit/delete food log items within Vitals page. Per `web.md` section 4.4.

### Lower Priority
- [ ] **Scanned Products** (`/products`) — Read-only. Product list + detail with nutrition label. Per `web.md` section 6.
- [ ] **Food Cache** (`/food-cache`) — Read-only. Cache list + detail. Per `web.md` section 7.

## Technical Debt

1. **No tests exist** — Zero test files despite Vitest being configured. The `src/test/` directory is empty.
2. **`src/test/setup.ts` missing** — Referenced in `vitest.config.ts` but file doesn't exist. Blocks all test execution.
3. **`src/counter.ts` orphaned** — Vite starter boilerplate, should be removed.
4. **No React error boundaries** — Uncaught render errors crash the component tree.
5. **`withTimeout` duplicated** — Identical implementation in `stepRepository.ts` and `sequenceRepository.ts`. Should be extracted to a shared utility.
6. **`stripEmptyStrings` duplicated** — Same function in `sequenceRepository.ts` and `scripts/migrateFirestore.ts`.
7. **`safeCollection`/`safeGetDocs` inconsistency** — `sequenceRepository.ts` has these helpers but `stepRepository.ts` uses inline null checks.
8. **No `.env.example`** — Environment variables not documented in a template file.
9. **No error toast/notification system** — Errors shown as inline red text only.
10. **`web.md` mentions shadcn/ui** — But no shadcn components are installed or used. The dependency list doesn't include it.
11. **`repeatMode`/`repeatCount` fields** — Referenced in `FIRESTORE_SCHEMA.md` and old mockups but removed from types and code. Schema doc is stale.
12. **`web.md` references `sequence_step_progress`** — Collection not mentioned in any repository or type. May be Android-only.

## Known Lint / Type Issues

- `StepCard.tsx` — May trigger "React is not defined" lint error (per `web.md` productionalization list)
- `useGooglePicker.ts` — Uses `any` types for Google API objects (eslint `warn`)
- No `npm run lint` or `npm run format` has been run recently (based on code state)

## Infrastructure Gaps

- [ ] **Firebase Hosting** — Not initialized. No `firebase.json`.
- [ ] **CI/CD** — No GitHub Actions or other pipeline.
- [ ] **PWA icons** — `pwa-192x192.png` and `pwa-512x512.png` referenced in manifest but may not exist in `public/`.
- [ ] **Service worker** — Actively unregistered in `main.tsx`. PWA not fully functional.
- [ ] **Firestore security rules** — Not documented or version-controlled in this repo.
- [ ] **`.env.example`** — Does not exist.

## Planned but Blocked

- **Recharts integration** — Dependency installed (`recharts@3.8.1`) but not imported anywhere. Intended for mood summary chart.
- **react-hook-form + zod** — Dependencies installed but not used. Intended for form-heavy pages (food log, notes).
- **Offline support** — Service worker unregistered. PWA manifest exists but SW not configured for offline.
