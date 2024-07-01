CREATE DATABASE IF NOT EXISTS db_module;
USE db_module;


CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT UNIQUE,
    winner_team INT,
    FOREIGN KEY (winner_team) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS venues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    city VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    unique_name VARCHAR(255) UNIQUE,
    specialization VARCHAR(255),
    nationality VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_of_match INT,
    venue_id INT,
    season_id INT,
    date DATE,
    toss_decision VARCHAR(255),
    team_1 INT,
    team_2 INT,
    toss_winner_team INT,
    winner_team INT,
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
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    innings INT,
    ball FLOAT,
    batting_team INT,
    bowling_team INT,
    striker INT,
    non_striker INT,
    bowler INT,
    runs_off_bat INT,
    extras INT,
    wides INT,
    noballs INT,
    byes INT,
    legbyes INT,
    penalty INT,
    wicket_type VARCHAR(255),
    player_dismissed INT,
    other_wicket_type VARCHAR(255),
    other_player_dismissed INT,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (batting_team) REFERENCES teams(id),
    FOREIGN KEY (bowling_team) REFERENCES teams(id),
    FOREIGN KEY (striker) REFERENCES players(id),
    FOREIGN KEY (non_striker) REFERENCES players(id),
    FOREIGN KEY (bowler) REFERENCES players(id),
    FOREIGN KEY (player_dismissed) REFERENCES players(id),
    FOREIGN KEY (other_player_dismissed) REFERENCES players(id)
);
