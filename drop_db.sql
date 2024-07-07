-- Use the database
USE cm_dadt;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Truncate all tables
TRUNCATE TABLE deliveries;
TRUNCATE TABLE matches;
TRUNCATE TABLE players;
TRUNCATE TABLE venues;
TRUNCATE TABLE seasons;
TRUNCATE TABLE teams;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;