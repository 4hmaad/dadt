const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql');

const MATCHES_INFO = {};
const DELIVERIES = {};
const PLAYERS = {};
const TEAMS = new Set();
const SEASONS = {};
const VENUES = {}

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '34439921',
  database: 'db_module'
};

const connection = mysql.createConnection(dbConfig);
connection.connect(err => {
  if (err) throw err;
  console.log('Connected to the database.');
});

const datasetDir = './dataset';

// Helper function to get match ID from file name
const getMatchId = (fileName) => {
  return parseInt(fileName.split('_')[0]);
};

// Function to process a single _info.csv file
const processInfoFile = (file) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(datasetDir, file);
    const matchId = getMatchId(file);
    const data = {}
    let team = 1
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        let [type, key, ...values] = Object.values(row);
        if (type === 'info') {

          if (key === 'team') {
            TEAMS.add(values.join(' '));
            key = `team_${team++}`
          }

          data[key] = values.join(' ');
        }
      })
      .on('end', () => {
        console.log(`Processed info file: ${file}`);
        const season = parseInt(data.season);
        if (!MATCHES_INFO[season]) {
          MATCHES_INFO[season] = [];
        }
        MATCHES_INFO[season].push({ ...data, id: matchId });
        VENUES[`${data.venue.split(',')[0]}`] = { name: data.venue, city: data.city }
        resolve(data);
      })
      .on('error', (error) => {
        console.error(`Error processing info file: ${file}`, error);
        reject(error);
      });
  });
};

// Function to process a single {match_id}.csv file
const processDeliveryFile = (file) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(datasetDir, file);
    const matchId = getMatchId(file);
    DELIVERIES[matchId] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        DELIVERIES[matchId].push(row);
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (error) => {
        console.error(`Error processing delivery file: ${file}`, error);
        reject(error);
      });
  });
};

// Function to process players.csv
const processPlayersFile = () => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(datasetDir, 'players.csv');

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        PLAYERS[row.id] = row;
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (error) => {
        console.error('Error processing players file', error);
        reject(error);
      });
  });
};

// Function to seed players data into the database
const seedPlayers = () => {
  const playerInsertPromises = Object.values(PLAYERS).map(player => {
    const query = `
      INSERT INTO players (name, unique_name, specialization, nationality)
      VALUES (?, ?, ?, ?)
    `;
    const values = [
      player.name,
      player.unique_name,
      player.specialization || null,
      player.nationality || null
    ];

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  });

  return Promise.all(playerInsertPromises)
    .catch(err => console.error('Error seeding players data:', err));
};

// Function to seed teams data into the database
const seedTeams = () => {
  console.log(TEAMS);
  const teamInsertPromises = Array.from(TEAMS).map(team => {
    const query = `
      INSERT INTO teams (name)
      VALUES (?)
    `;
    const values = [team];

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  });

  return Promise.all(teamInsertPromises)
    .catch(err => console.error('Error seeding teams data:', err));
};

// Helper function to get team ID by name
const getTeamIdByName = (teamName) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id FROM teams WHERE name = ?`;
    connection.query(query, [teamName], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.id);
    });
  });
};

// Helper function to get player ID by name
const getPlayerIdByName = (playerName) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id FROM players WHERE name = ?`;
    connection.query(query, [playerName], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.id);
    });
  });
};

// Helper function to get venue ID by name
const getVenueIdByName = (venueName) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id FROM venues WHERE name = ?`;
    connection.query(query, [venueName], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.id);
    });
  });
};

// Helper function to get season ID by year
const getSeasonIdByYear = (seasonYear) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id FROM seasons WHERE year = ?`;
    connection.query(query, [seasonYear], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.id);
    });
  });
};

const seedMatches = async () => {
  for (const [seasonYear, matches] of Object.entries(MATCHES_INFO)) {
    const seasonId = await getSeasonIdByYear(seasonYear);

    for (const match of matches) {
      const venueId = await getVenueIdByName(match.venue.split(',')[0]);
      const team1Id = await getTeamIdByName(match.team_1);
      const team2Id = await getTeamIdByName(match.team_2);
      const tossWinnerTeamId = await getTeamIdByName(match.toss_winner);
      const winnerTeamId = await getTeamIdByName(match.winner);
      const playerOfMatchId = match.player_of_match ? await getPlayerIdByName(match.player_of_match) : null;

      const isFinal = match.id === matches[matches.length - 1].id;

      const query = `
        INSERT INTO matches (id, player_of_match, venue_id, season_id, date, toss_decision, team_1, team_2, toss_winner_team, winner_team, is_final)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        match.id,
        playerOfMatchId,
        venueId,
        seasonId,
        new Date(match.date),
        match.toss_decision,
        team1Id,
        team2Id,
        tossWinnerTeamId,
        winnerTeamId,
        isFinal,
      ];

      await new Promise((resolve, reject) => {
        connection.query(query, values, (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    }
  }

  console.log('Seeded matches data');
};


// Function to extract seasons data from MATCHES_INFO
const extractSeasons = () => {
  for (const seasonYear in MATCHES_INFO) {
    const matches = MATCHES_INFO[seasonYear];
    const lastMatch = matches[matches.length - 1];
    SEASONS[seasonYear] = lastMatch.winner;
  }
};

// Function to seed seasons data into the database
const seedSeasons = async () => {
  for (const [seasonYear, winnerTeamName] of Object.entries(SEASONS)) {
    const winnerTeamId = await getTeamIdByName(winnerTeamName);

    const query = `
      INSERT INTO seasons (year, winner_team)
      VALUES (?, ?)
    `;
    const values = [seasonYear, winnerTeamId];

    await new Promise((resolve, reject) => {
      connection.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  console.log('Seeded seasons data');
};

const seedVenues = () => {
  console.log(VENUES)
  const venueInsertPromises = Object.values(VENUES).map(venue => {
    const query = `
      INSERT INTO venues (name, city)
      VALUES (?, ?)
    `;
    const values = [venue.name, venue.city];

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  });

  return Promise.all(venueInsertPromises)
    .then(() => console.log('Seeded venues data'))
    .catch(err => console.error('Error seeding venues data:', err));
};

const seedDeliveries = async () => {

  await Promise.all(
    Object.entries(DELIVERIES).map(async ([matchId, deliveries]) => {
      await Promise.all(
        deliveries.map(async (delivery) => {
          const battingTeamId = await getTeamIdByName(delivery.batting_team);
          const bowlingTeamId = await getTeamIdByName(delivery.bowling_team);
          const strikerId = await getPlayerIdByName(delivery.striker);
          const nonStrikerId = await getPlayerIdByName(delivery.non_striker);
          const bowlerId = await getPlayerIdByName(delivery.bowler);
          const playerDismissedId = delivery.player_dismissed ? await getPlayerIdByName(delivery.player_dismissed) : null;
          const otherPlayerDismissedId = delivery.other_player_dismissed ? await getPlayerIdByName(delivery.other_player_dismissed) : null;

          const query = `
        INSERT INTO deliveries (match_id, innings, ball, batting_team, bowling_team, striker, non_striker, bowler, runs_off_bat, extras, wides, noballs, byes, legbyes, penalty, wicket_type, player_dismissed, other_wicket_type, other_player_dismissed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
          const values = [
            matchId,
            delivery.innings,
            delivery.ball,
            battingTeamId,
            bowlingTeamId,
            strikerId,
            nonStrikerId,
            bowlerId,
            delivery.runs_off_bat ? parseInt(delivery.runs_off_bat) : null,
            delivery.extras ? parseInt(delivery.extras) : null,
            delivery.wides ? parseInt(delivery.wides) : null,
            delivery.noballs ? parseInt(delivery.noballs) : null,
            delivery.byes ? parseInt(delivery.byes) : null,
            delivery.legbyes ? parseInt(delivery.legbyes) : null,
            delivery.penalty ? parseInt(delivery.penalty) : null,
            delivery.wicket_type,
            playerDismissedId,
            delivery.other_wicket_type,
            otherPlayerDismissedId
          ];

          await new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
              if (err) return reject(err);
              resolve(results);
            });
          });
        }));
    })
  );

  console.log('Seeded deliveries data');
};


const main = async () => {
  const infoFiles = fs.readdirSync(datasetDir)
    .filter(file => file.endsWith('_info.csv'))
    .sort((a, b) => getMatchId(a) - getMatchId(b));
  const deliveryFiles = fs.readdirSync(datasetDir)
    .filter(file => file.match(/^\d+\.csv$/))
    .sort((a, b) => getMatchId(a) - getMatchId(b));

  await Promise.all(deliveryFiles.map(processDeliveryFile));
  await Promise.all(infoFiles.map(processInfoFile));
  await processPlayersFile();
  console.log('All files processed.');

  extractSeasons();

  // Seed players and teams data
  await seedPlayers();
  await seedTeams();
  await seedSeasons();
  await seedVenues();
  await seedMatches();
  await seedDeliveries();

  connection.end();
};

main();
