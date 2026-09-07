# International Woodcarver Club — Membership System

Membership database and web application for an international woodcarver club:
a React single-page app, a REST API, and a PostgreSQL database.

- `web/` — React 18 + TypeScript SPA (Vite), targeting Chrome, Edge, Firefox, Opera, Brave
- `api/` — Express 5 + TypeScript REST API
- `db/schema.sql` — PostgreSQL schema (`woodcarver` schema)
- `DESIGN.md` — data model, API surface and design decisions

## Requirements

- Node.js 22+
- PostgreSQL 15+ (or Docker)

## Running locally

```bash
# 1. Database
docker run -d --name woodcarver-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=woodcarver postgres:16

# 2. API
cd api
cp .env.example .env
npm install
npm run migrate   # applies db/schema.sql, then db/migrations/*.sql
npm run seed      # ISO 3166 + ISO 639-2 reference data, craft skills, tiers, demo members
npm run dev       # http://localhost:4000

# 3. Frontend (separate terminal)
cd web
npm install
npm run dev       # http://localhost:5173, proxies /api to the API
```

Everything at once with Docker Compose (frontend on http://localhost:8080):

```bash
docker compose up --build
docker compose exec api node -e "1" # then run migrate/seed against the container database
```

### Demo accounts

Seeded members all share the password `Woodcarver!2026`:

| Alias | Roles | Notes |
| --- | --- | --- |
| `admin` | MEMBER, ADMIN | Can open the Member Listing page |
| `gouge_master` | MEMBER | Advanced tier |
| `spoonbird` | MEMBER | Basic tier |
| `oakcarver` | MEMBER | Suspended — cannot sign in |

## Pages

| Route | Access | Contents |
| --- | --- | --- |
| `/login` | public | Email address or member alias, password, submit, forgot password link |
| `/forgot-password` | public | Email or member alias, submit |
| `/home` | member | The member's crafts and skills |
| `/account` | member | Full member record, editable contact/address/craft skills |
| `/admin/members` | admin | All member profiles with a per-row active-status dropdown |

## API

Base path `/api/v1`; see `DESIGN.md` for the full endpoint table. Authentication is a
short-lived JWT access token plus an HttpOnly refresh cookie. Passwords are hashed with
scrypt; password reset tokens are stored hashed, single-use and expiring.

## Scripts

```bash
npm run lint       # api/ and web/
npm run typecheck
npm test
npm run build
```

## Deployment

The API is a plain container listening on `PORT` with a `DATABASE_URL` and `JWT_SECRET`,
so it runs unchanged on AWS (ECS/Fargate + RDS), Azure (Container Apps + Azure Database
for PostgreSQL) or GCP (Cloud Run + Cloud SQL). The frontend builds to static files served
by nginx (`web/Dockerfile`). Set `PGSSLMODE=require` where the managed database enforces TLS.
