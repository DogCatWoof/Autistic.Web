# Coding Guidelines

## Style

### TypeScript
- **Strict mode** enabled (`"strict": true` in `tsconfig.json`)
- `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`
- `verbatimModuleSyntax: true` — explicit `type` imports required
- Target: ES2023
- JSX: `react-jsx` (no need to import React)

### Formatting (Prettier)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Linting (ESLint)
- Flat config in `eslint.config.js`
- `@typescript-eslint/no-explicit-any: warn`
- `@typescript-eslint/no-unused-vars: error` (with `argsIgnorePattern: ^_`)
- `react/react-in-jsx-scope: off` (not needed with react-jsx)
- `jsx-a11y` rules at `warn` level

## Component Conventions

- **Functional components** exclusively — no class components
- **Default exports** for page and component files
- **Named exports** for hooks and utility functions
- File names match component names (PascalCase for components, camelCase for hooks)
- TypeScript interfaces defined in separate `types/` files, not inline
- No comments in code (per `~/.agents/AGENTS.md` rules)

## File Organization

```
src/
├── pages/        # Route-level components (one per route)
├── components/   # Reusable UI components
├── hooks/        # React Query wrappers and custom hooks
├── repositories/ # Firestore query functions (no business logic)
├── types/        # TypeScript interfaces and types
├── lib/          # Firebase init, external API integrations
├── styles/       # Global CSS
└── test/         # Test files (currently empty)
```

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `SequenceEditor.tsx` |
| Hook files | camelCase with `use` prefix | `useSequences.ts` |
| Repository files | camelCase with `Repository` suffix | `sequenceRepository.ts` |
| Type files | camelCase | `step.ts`, `sequence.ts` |
| Utility files | camelCase | `navConfig.ts` |
| Interfaces | PascalCase | `Step`, `Sequence`, `MediaAttachment` |
| Functions | camelCase | `fetchSequences`, `createStepDoc` |
| React Query hooks | `use` + entity name | `useSequences`, `useSteps`, `useActiveRuns` |
| Mutation hooks | `use` + action + entity | `useCreateSequence`, `useUpdateStep` |

## Error Handling

- Repository functions return nullable values (`null` on failure or missing config)
- Timeout wrapper logs warnings and re-throws
- Component-level error display: inline `<div>` with red text
- No React error boundaries
- No toast/snackbar notifications

## Data Patterns

### Repository Layer
- All Firestore queries in `src/repositories/`
- No business logic in repositories — pure data access
- Functions return typed arrays or single objects
- `db` null guard at the start of every function

### Hook Layer
- React Query hooks wrap repository functions
- Mutations invalidate related query keys on `onSuccess`
- No optimistic updates
- `retry: false` on list queries, default on single-entity queries

### Component Layer
- Local `useState` for all UI state
- `useRef` for dirty tracking and non-rendering values
- `useMemo` for derived data (step IDs, available steps)
- `window.confirm()` for destructive action confirmation

## CSS / Styling

- **Tailwind CSS v4** exclusively — no CSS modules, no styled-components
- Utility classes applied directly in JSX
- CSS custom properties in `globals.css` for theme colors (not actively used in components)
- Responsive: `md:` breakpoint for desktop vs. mobile layout
- No dark mode support

## Import Order

No enforced import ordering. Observed convention:
1. React / library imports
2. Local component imports
3. Hook imports
4. Type imports (with `type` keyword per `verbatimModuleSyntax`)
5. CSS imports (last)

## Testing

- **Vitest** with `jsdom` environment
- **Testing Library** for component tests
- `src/test/setup.ts` must be created before tests work
- Test files: `src/**/*.{test,spec}.{ts,tsx}` pattern
- No tests currently exist
- Run: `npm run test` (watch) or `npm run test:run` (single)

## Scripts

Migration scripts in `scripts/` use `firebase-admin` SDK:
- Run via `npx tsx scripts/<name>.ts`
- npm scripts: `migrate:firestore`, `migrate:normalize`
- Require service account credentials (via file path, env var, or application default)
