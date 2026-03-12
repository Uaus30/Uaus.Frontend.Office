# GestãoPro — Sistema de Gestão Empresarial

## Overview

Full-stack business management system with a dark-mode, responsive dashboard. Features sales management, products with tags, customers, categories, users, and comprehensive analytics.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/gestao) — dark mode, responsive
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all routes)
│   └── gestao/             # React + Vite frontend (/)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
```

## Auth

Session-based with cookies. `session_user_id` cookie stores the user ID.

**Default credentials (from seed):**
- admin@gestao.pro / admin123 (Administrador)
- maria@gestao.pro / maria123 (Gerente)
- joao@gestao.pro / joao123 (Vendedor)

## Features

- **Dashboard**: KPIs (revenue, sales, avg ticket, profit), area charts, pie charts, top products
- **Produtos**: CRUD with categories, tags (colored badges), stock, price/cost
- **Categorias**: Category management with product counts
- **Etiquetas**: Tag management with color picker + sales/stock reports per tag
- **Vendas**: Sales CRUD with items, customer, payment method, discount
- **Clientes**: Customer management with purchase history
- **Usuários**: User management with roles (admin/manager/seller)

## DB Schema

- `users` — system users with roles
- `categories` — product categories
- `tags` — product tags with color
- `products` — products with price, cost, stock
- `product_tags` — many-to-many products ↔ tags
- `customers` — customers
- `sales` — sales with payment method
- `sale_items` — line items per sale

## Running

- Frontend: `pnpm --filter @workspace/gestao run dev`
- API: `pnpm --filter @workspace/api-server run dev`
- Seed: `pnpm --filter @workspace/scripts run seed`
- DB push: `pnpm --filter @workspace/db run push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
