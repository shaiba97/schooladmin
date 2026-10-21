# Spec: Admin Portal — Full Build

## Objective
Build out the complete Admin Portal shell and all feature sections. Academic Affairs reuses existing academic app routes. Financial Affairs, People & Operations, and Administration & System are net-new. RBAC is real (backend-enforced, not just hidden nav).

## Tech Stack
- Next.js 16 App Router, TypeScript, shadcn/ui 4.21, Tailwind 4, lucide-react v1
- NestJS 11 backend, Prisma 7 / PostgreSQL (Neon), bcrypt cost 10
- Recharts for charts, date-fns for dates, socket.io-client for realtime
- Cookie-based auth (`ad_token`, `ad_tenant`), proxy to backend at `localhost:3000`

## Commands
```
dev:    npm run dev          (port 5400)
build:  npm run build
lint:   npx.cmd eslint <files>
type:   npx.cmd tsc --noEmit -p tsconfig.json
```

## Project Structure
```
admin/app/(portal)/         — authenticated portal pages (sidebar shell)
admin/app/(auth)/login/     — login page
admin/components/portal/    — sidebar, layout, mobile top bar
admin/components/auth/      — session provider, Can gate
admin/components/ui/        — shadcn primitives
admin/lib/api/              — client, session, proxy helpers
admin/app/api/backend/      — catch-all proxy to backend
```

## Code Style
- Server components by default; client component only when interactivity needed
- shadcn/ui components from `@/components/ui/`
- `adminApiFetch(path)` for all backend calls (handles auth + 401 redirect)
- `cn()` for classname merging; `LucideIcon` type for icon props
- No emojis in UI; literal strings for all user-facing text

## Testing Strategy
- Frontend: `tsc --noEmit` + `eslint` after each phase
- Backend: `jest` + `tsc --noEmit` after controller/model changes
- Manual: two-account RBAC proof after Phase 2

## Boundaries
- **Always:** verify build + lint before moving to next phase
- **Ask first:** new npm dependencies, database migrations, route renames
- **Never:** commit secrets, remove existing routes, bypass RBAC on backend

## Success Criteria
- All 5 nav sections have full sub-items visible per role
- Every route renders without build errors
- Accountant cannot see Academic nav items; Teacher cannot see Financial nav items
- Backend rejects out-of-scope API calls with 403 (not just hidden in UI)
- Financial Affairs: Fees → Invoices → Discounts → Expenses → Dashboard → Reports all functional
- People & Operations: Departments CRUD, Staff Attendance entry, Notifications creation, Communication log
- Administration & System: Users CRUD, Settings screens, Audit Logs interceptor, Integrations config, Tenant Management

## Open Questions
- None — all 5 confirmation questions resolved by user
