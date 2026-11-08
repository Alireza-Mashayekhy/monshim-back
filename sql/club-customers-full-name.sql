ALTER TABLE club_customers ADD COLUMN fullName VARCHAR(160) NOT NULL DEFAULT '';

UPDATE club_customers
SET fullName = TRIM(CONCAT(IFNULL(firstName, ''), ' ', IFNULL(lastName, '')));

ALTER TABLE club_customers ALTER COLUMN fullName DROP DEFAULT;

ALTER TABLE club_customers DROP COLUMN firstName, DROP COLUMN lastName;