-- Adds the ISO 639-2 language reference table, plus the member gender and
-- preferred language fields.

CREATE TABLE IF NOT EXISTS woodcarver.language (
    language_code   CHAR(3) PRIMARY KEY CHECK (language_code ~ '^[a-z]{3}$'),
    language_desc   VARCHAR(100) NOT NULL,
    language_code_t CHAR(3) CHECK (language_code_t ~ '^[a-z]{3}$'),
    language_code_1 CHAR(2) UNIQUE CHECK (language_code_1 ~ '^[a-z]{2}$')
);

DO $$
BEGIN
    CREATE TYPE woodcarver.gender AS ENUM ('Male', 'Female', 'Do Not Wish To Disclose');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE woodcarver.member
    ADD COLUMN IF NOT EXISTS gender woodcarver.gender
        NOT NULL DEFAULT 'Do Not Wish To Disclose',
    ADD COLUMN IF NOT EXISTS preferred_language_code CHAR(3)
        REFERENCES woodcarver.language (language_code);

CREATE INDEX IF NOT EXISTS member_preferred_language_code_idx
    ON woodcarver.member (preferred_language_code);
