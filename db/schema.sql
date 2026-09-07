-- International Woodcarver Membership Database
-- PostgreSQL 15+ schema

CREATE SCHEMA IF NOT EXISTS woodcarver;
SET search_path TO woodcarver, public;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

-- ISO 3166-1 alpha-2 countries, loaded from an ISO 3166 data store.
CREATE TABLE country (
    country_code  CHAR(2) PRIMARY KEY CHECK (country_code ~ '^[A-Z]{2}$'),
    country_desc  VARCHAR(100) NOT NULL
);

-- ISO 3166-2 subdivisions, loaded from an ISO 3166 data store.
CREATE TABLE state_province (
    state_province_code VARCHAR(6) PRIMARY KEY
        CHECK (state_province_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'),
    state_province_desc VARCHAR(100) NOT NULL,
    country_code        CHAR(2) NOT NULL REFERENCES country (country_code),
    CONSTRAINT state_province_code_matches_country
        CHECK (left(state_province_code, 2) = country_code)
);

CREATE INDEX state_province_country_code_idx ON state_province (country_code);

CREATE TABLE craft_skill (
    craft_skill_code VARCHAR(20) PRIMARY KEY,
    craft_skill_desc VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Discounts and membership tiers
-- ---------------------------------------------------------------------------

CREATE TABLE member_discount (
    member_discount_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_discount_desc VARCHAR(100) NOT NULL,
    discount_pct        NUMERIC(5, 2) NOT NULL
        CHECK (discount_pct >= 0 AND discount_pct <= 100),
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    CONSTRAINT member_discount_effective_range
        CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE member_discount_profile (
    member_discount_profile_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_discount_profile_desc VARCHAR(100) NOT NULL
);

-- A profile bundles one or more discounts.
CREATE TABLE member_discount_profile_item (
    member_discount_profile_id BIGINT NOT NULL
        REFERENCES member_discount_profile (member_discount_profile_id),
    member_discount_id BIGINT NOT NULL
        REFERENCES member_discount (member_discount_id),
    PRIMARY KEY (member_discount_profile_id, member_discount_id)
);

CREATE TABLE membership_tier (
    member_tier_code VARCHAR(10) PRIMARY KEY
        CHECK (member_tier_code IN ('Basic', 'Advanced', 'Lifetime')),
    member_tier_desc VARCHAR(100) NOT NULL,
    member_discount_profile_id BIGINT
        REFERENCES member_discount_profile (member_discount_profile_id)
);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

CREATE TYPE telephone_type AS ENUM ('Mobile', 'Landline');

CREATE TABLE member (
    member_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_alias        VARCHAR(50) NOT NULL UNIQUE,
    member_first_name   VARCHAR(50) NOT NULL,
    member_middle_name  VARCHAR(50),
    member_last_name    VARCHAR(50) NOT NULL,
    email_address       VARCHAR(254) NOT NULL UNIQUE,
    telephone_number_1  VARCHAR(20) NOT NULL,
    telephone_type_1    telephone_type NOT NULL,
    telephone_number_2  VARCHAR(20),
    telephone_type_2    telephone_type,
    address_line_1      VARCHAR(100) NOT NULL,
    address_line_2      VARCHAR(100),
    state_province_code VARCHAR(6) NOT NULL
        REFERENCES state_province (state_province_code),
    country_code        CHAR(2) NOT NULL REFERENCES country (country_code),
    member_tier_code    VARCHAR(10) NOT NULL REFERENCES membership_tier (member_tier_code),
    -- Y = Active, N = Not Active, S = Suspended
    active_ind          CHAR(1) NOT NULL DEFAULT 'Y'
        CHECK (active_ind IN ('Y', 'N', 'S')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT member_telephone_2_type_required
        CHECK ((telephone_number_2 IS NULL) = (telephone_type_2 IS NULL))
);

CREATE INDEX member_last_name_idx ON member (member_last_name);
CREATE INDEX member_tier_code_idx ON member (member_tier_code);
CREATE INDEX member_country_code_idx ON member (country_code);

-- A member holds one or more craft skills.
CREATE TABLE member_craft_skill (
    member_id        BIGINT NOT NULL REFERENCES member (member_id) ON DELETE CASCADE,
    craft_skill_code VARCHAR(20) NOT NULL REFERENCES craft_skill (craft_skill_code),
    PRIMARY KEY (member_id, craft_skill_code)
);

CREATE INDEX member_craft_skill_craft_skill_code_idx
    ON member_craft_skill (craft_skill_code);

-- ---------------------------------------------------------------------------
-- Authentication and authorization
-- ---------------------------------------------------------------------------

CREATE TABLE member_credential (
    member_id        BIGINT PRIMARY KEY REFERENCES member (member_id) ON DELETE CASCADE,
    password_hash    TEXT NOT NULL,
    password_set_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    failed_attempts  INTEGER NOT NULL DEFAULT 0,
    locked_until     TIMESTAMPTZ
);

CREATE TABLE app_role (
    role_code VARCHAR(20) PRIMARY KEY,
    role_desc VARCHAR(100) NOT NULL
);

CREATE TABLE member_role (
    member_id BIGINT NOT NULL REFERENCES member (member_id) ON DELETE CASCADE,
    role_code VARCHAR(20) NOT NULL REFERENCES app_role (role_code),
    PRIMARY KEY (member_id, role_code)
);

-- Single-use tokens issued by the Forgot Password page.
CREATE TABLE password_reset_token (
    token_hash  TEXT PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member (member_id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE INDEX password_reset_token_member_id_idx ON password_reset_token (member_id);

INSERT INTO app_role (role_code, role_desc) VALUES
    ('MEMBER', 'Standard member'),
    ('ADMIN',  'Administrator who can manage members and their status');
