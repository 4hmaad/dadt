CREATE DATABASE IF NOT EXISTS cm_dadt;
USE cm_dadt;

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS seasons (
    id VARCHAR(255) PRIMARY KEY,
    year INT NOT NULL UNIQUE,
    winner_team VARCHAR(255) NOT NULL,
    FOREIGN KEY (winner_team) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS venues (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    city VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(255) PRIMARY KEY,
    unique_name VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    specialization VARCHAR(255),
    nationality VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(255) PRIMARY KEY,
    player_of_match VARCHAR(255),
    venue_id VARCHAR(255) NOT NULL,
    season_id VARCHAR(255) NOT NULL,
    date DATE,
    toss_decision VARCHAR(255),
    team_1 VARCHAR(255) NOT NULL,
    team_2 VARCHAR(255) NOT NULL,
    toss_winner_team VARCHAR(255),
    winner_team VARCHAR(255),
    is_final BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (player_of_match) REFERENCES players(id),
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (team_1) REFERENCES teams(id),
    FOREIGN KEY (team_2) REFERENCES teams(id),
    FOREIGN KEY (toss_winner_team) REFERENCES teams(id),
    FOREIGN KEY (winner_team) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    id VARCHAR(255) PRIMARY KEY,
    match_id VARCHAR(255) NOT NULL,
    innings INT NOT NULL,
    ball FLOAT,
    batting_team VARCHAR(255),
    bowling_team VARCHAR(255),
    striker VARCHAR(255),
    non_striker VARCHAR(255),
    bowler VARCHAR(255),
    runs_off_bat INT,
    extras INT,
    wicket_type VARCHAR(255),
    player_dismissed VARCHAR(255),
    other_wicket_type VARCHAR(255),
    other_player_dismissed VARCHAR(255),
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (batting_team) REFERENCES teams(id),
    FOREIGN KEY (bowling_team) REFERENCES teams(id),
    FOREIGN KEY (striker) REFERENCES players(id),
    FOREIGN KEY (non_striker) REFERENCES players(id),
    FOREIGN KEY (bowler) REFERENCES players(id),
    FOREIGN KEY (player_dismissed) REFERENCES players(id),
    FOREIGN KEY (other_player_dismissed) REFERENCES players(id)
);