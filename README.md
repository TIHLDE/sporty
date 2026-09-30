# sporty

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **tRPC** - End-to-end type-safe APIs
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Oxlint & Oxfmt** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

Generate the Prisma client before development, typechecking, or building, including in CI and deployment builds. Run this again after changing the Prisma schema:

```bash
bun run db:generate
```

This project uses PostgreSQL with Prisma.

1. `bun run dev` starts the local PostgreSQL container (`infra/docker`), generates the Prisma client and pushes the schema (`packages/db`) before the web app starts. To start only the database, run `bun run docker:dev`.
2. Copy `.env.example` to `.env` in the repo root. The default `DATABASE_URL` matches the local container.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@sporty/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

The root `.env` is the only env file in the project; `.env.example` lists the variables. Copy it and fill in the values:

```bash
cp .env.example .env
```

Vite (`apps/web/vite.config.ts`), the Prisma CLI (`packages/db/prisma.config.ts`) and Docker Compose (`infra/docker`) all read this file. Bun's automatic env loading is disabled in `bunfig.toml`. Server code reads values through `ENV` in `apps/web/src/env.server.ts`.

## Deployment

### Docker Compose

- Production: `infra/docker/docker-compose.yml` (database + web, built from `infra/docker/Dockerfile`). Run `docker compose up -d` in `infra/docker`, or `bun run docker:prod` from the root to rebuild and start.
- Development: `infra/docker/docker-compose.dev.yml` (database only), started by `bun run dev` or `bun run docker:dev`.
- Stop: `bun run docker:prod:down`

Environment variables are read from the root `.env` file and overridden in `infra/docker/docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Git Hooks and Formatting

- Lint: `bun run lint` (`bun run lint:fix` to apply fixes)
- Format: `bun run format` to check, `bun run format:fix` to write

## Project Structure

```
sporty/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── infra/
│   └── docker/      # Docker Compose (database + web image)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start the database container and all applications in development mode
- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run lint` / `bun run lint:fix`: Run Oxlint
- `bun run format` / `bun run format:fix`: Check or apply Oxfmt formatting
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run docker:dev` / `bun run docker:dev:down`: Start or stop the local database container
- `bun run docker:fresh`: Recreate the database container with an empty volume
- `bun run docker:prod` / `bun run docker:prod:down`: Build and start, or stop, the full Docker Compose stack
