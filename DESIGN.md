# International Woodcarver Membership Database — Technical Design

Derived from `Project_Overview.docx`. The DDL in `schema.sql` has been executed against
PostgreSQL 16 without errors.

## 1. Architecture

- **Frontend**: React (Vite) SPA, targeting Chrome, Edge, Firefox, Opera and Brave —
  all Chromium/Gecko evergreen browsers, so ES2022 + modern CSS is safe; no IE/legacy
  polyfills needed. Browserslist: `defaults, not dead, not op_mini all`.
- **Backend**: stateless REST API, containerised, deployable to AWS (ECS/Fargate + RDS),
  Azure (Container Apps + Azure Database for PostgreSQL) or GCP (Cloud Run + Cloud SQL).
  Keeping the service to a plain container image plus a Postgres connection string is what
  makes all three targets equivalent — no cloud-specific managed services in the app tier.
- **Database**: PostgreSQL 15+, schema `woodcarver`.

## 2. Data model

Reference tables: `country` (ISO 3166-1 alpha-2), `state_province` (ISO 3166-2, FK to
country, with a check that the subdivision prefix matches its country), `craft_skill`.

Core: `member`, `member_craft_skill` (a member holds one or more craft skills), `membership_tier`, `member_discount_profile`, `member_discount`, plus the
join table `member_discount_profile_item` (a profile bundles one or more discounts).

Auth: `member_credential` (scrypt hash, lockout counters), `app_role` (`MEMBER`, `ADMIN`),
`member_role`, `password_reset_token` (hashed, single-use, expiring).

`active_ind`: `Y` = Active, `N` = Not Active, `S` = Suspended.

Phone numbers keep a paired type column (`Mobile` / `Landline`); a check constraint enforces
that number 2 and its type are either both present or both absent.

### Decisions made where the spec was silent

| Item | Decision |
| --- | --- |
| `Membership_Tier.Member_Tier_Desc` | Added — the Member Account and Member Listing pages display it. |
| `Membership_Tier.Member_Type_Code` | Omitted; undefined in the spec and redundant with `member_tier_code`. |
| `Member_Discount` columns | `member_discount_desc`, `discount_pct`, `effective_from`, `effective_to`. |
| `Member_Discount_Profile` columns | `member_discount_profile_desc` + items join table. |
| `Member.City` / `Member.Postal_Code` | Added to the member address. `city` is required; `postal_code` is nullable because several countries have no postal code system. |
| Craft skills per member | Many, via the `member_craft_skill` join table. Member Account and Member Listing show the skills as a list of `craft_skill_desc` values. |

## 3. REST API

All endpoints under `/api/v1`. JSON request/response. Bearer JWT (access token ~15 min,
refresh token in an HttpOnly, Secure, SameSite=Strict cookie).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Body `{identifier, password}` where identifier is email **or** member alias. |
| POST | `/auth/refresh` | cookie | New access token. |
| POST | `/auth/logout` | member | Revoke refresh token. |
| POST | `/auth/forgot-password` | public | Body `{identifier}`. Always returns 202 (no account enumeration). |
| POST | `/auth/reset-password` | token | Body `{token, newPassword}`. |
| GET | `/members/me` | member | Member Account page payload. |
| PATCH | `/members/me` | member | Update own contact/address fields and craft-skill set (`craftSkillCodes` replaces the whole set). |
| GET | `/members` | admin | Member Listing; paginated, filter by `activeInd`, `tierCode`, `countryCode`, search by name/alias/email. |
| POST | `/members` | admin | Create member. |
| GET | `/members/{id}` | admin | Single member. |
| PATCH | `/members/{id}` | admin | Update member, including `activeInd` (the listing-page dropdown). |
| GET | `/countries` | member | Reference data for dropdowns. |
| GET | `/countries/{code}/state-provinces` | member | Subdivisions for a country. |
| GET | `/craft-skills` | member | Reference data. |
| GET | `/membership-tiers` | member | Reference data. |

Errors use RFC 9457 `application/problem+json`. Validation failures return 422 with a
per-field list. Login and forgot-password are rate-limited per IP and per identifier.

## 4. Frontend pages

- **Login** — Email address *or* Member Alias, Password, Submit, Forgot Password link.
- **Forgot Password** — Email or Member Alias, Submit; always shows the same confirmation.
- **Member Home** — the member's craft and skill information.
- **Member Account** — read/edit of the member's own record: ID, alias, first/middle/last
  name, email, both telephone numbers, both address lines, state/province, country,
  craft skill descriptions (multi-select), tier description, active indicator (read-only to
  the member).
- **Member Listing** (admin only) — table of all members with the same columns plus a
  per-row dropdown to change `active_ind` (Active / Not Active / Suspended), calling
  `PATCH /members/{id}`. Server-side pagination, sorting and filtering.

Route guards: `MEMBER` role for account/home, `ADMIN` role for the listing; the API
re-checks the role on every request — the frontend guard is convenience only.

## 5. Security

- scrypt password hashing (self-describing encoding, swappable for Argon2id); password policy
  enforced server-side.
- Reset tokens stored hashed, single-use, 30-minute expiry.
- Account lockout after repeated failed logins (`failed_attempts`, `locked_until`).
- TLS everywhere; secrets from the cloud provider's secret manager, never in the image.
- All member-scoped endpoints derive the member ID from the token, never from the request
  body, so a member cannot read or modify another member's record.

## 6. Reference data loading

`country` and `state_province` are populated from an ISO 3166 data store (e.g. the
`iso-3166`/`iso-3166-2` datasets) by an idempotent seed job run at deploy time, upserting
by code so subdivisions renamed upstream are corrected without breaking member FKs.

## 7. Open questions

1. Confirm the discount profile/discount columns above match your billing intent.
2. Is `Member_Type_Code` genuinely needed, and if so what does it hold?
3. Should admins be members with the `ADMIN` role (current design), or a separate user table?
4. Self-service registration, or admin-created accounts only?
