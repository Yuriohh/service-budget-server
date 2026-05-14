# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
yarn dev                        # Start server with hot-reload (tsx watch) on port 3333

# Code quality
yarn lint                       # ESLint
yarn format                     # Prettier (writes in-place)

# Database
make up                         # Start PostgreSQL via Docker Compose
make down                       # Stop PostgreSQL
yarn prisma migrate dev         # Run migrations and regenerate Prisma client
yarn prisma validate            # Validate schema (requires DATABASE_URL)
yarn prisma studio              # Open Prisma GUI
```

No test suite exists yet.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `PG_PASSWORD`, `PG_USER`, `PG_DATABASE` — used by `docker-compose.yaml`
- `SALT` — bcrypt salt rounds (defaults to 10)

## Architecture

**Stack:** Fastify 5 + TypeScript (ESM) + Prisma ORM + PostgreSQL + Zod validation via `fastify-type-provider-zod`.

**Request lifecycle:**
1. Zod schemas in `src/schemas/` define and validate request bodies/params.
2. Routes in `src/routes/` register handlers under prefixes (`/user`, `/budgets`).
3. `src/middleware/auth.ts` — `authMiddleware` hook calls `request.jwtVerify()` and is applied to the entire `budgetRoutes` plugin via `fastify.addHook('preHandler', ...)`.
4. `src/lib/prisma.ts` — singleton Prisma client used by all routes.

**Auth flow:** JWT issued at `POST /user/login` with payload `{ id: string }`. The type augmentation in `src/@types/fastify-jwt.d.ts` makes `request.user.id` typed throughout the app.

**Data model:**
- `User` owns many `Budget`s (1-to-many).
- `Budget` contains many `ServiceItem`s (1-to-many, cascade delete).
- Budget `status` defaults to `"draft"`.

**Route ownership enforcement:** All budget mutations (`PATCH /budgets/update/:id`, `DELETE /budgets/budgets/:id`) first query with `{ userId, id }` before acting, so users can only modify their own budgets.

**Validation errors** are caught by the global `setErrorHandler` and returned as structured `400` responses. Response serialization errors return `500` with Zod issue details.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`: ESLint, Prettier check, and `prisma validate`. Uses `yarn --immutable` — do not change `yarn.lock` without running `yarn install` locally first.

## Conventions

- Package manager: **Yarn 4** (via Corepack). Use `yarn` not `npm`.
- All routes use `fastify.withTypeProvider<ZodTypeProvider>()` when a Zod schema is attached; omit it for untyped routes (e.g., `GET /budgets/`).
- Schemas live in `src/schemas/`, one file per domain (`auth.schemas.ts`, `budget.schema.ts`).
- Pre-commit hook (Husky + lint-staged) runs ESLint + Prettier on staged `src/**/*.ts` files automatically.
