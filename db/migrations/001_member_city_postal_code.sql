-- Adds the city and postal code fields to the member address.
ALTER TABLE woodcarver.member
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

UPDATE woodcarver.member SET city = 'Unknown' WHERE city IS NULL;

ALTER TABLE woodcarver.member ALTER COLUMN city SET NOT NULL;
