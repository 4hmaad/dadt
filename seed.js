const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql');
const { v4: uuid } = require('uuid');

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
  database: 'cm_dadt'
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


const TEAMS_VALUES = {
  "King XI Punjab": "Punjab Kings",
  "Kings XI Punjab": "Punjab Kings",
  "Rajasthan Royals": "Rajasthan Royals",
  "Chennai Super Kings": "Chennai Super Kings",
  "Sunrisers Hyderabad": "Sunrisers Hyderabad",
  "Delhi Daredevils": "Delhi Capitals",
  "Kolkata Knight Riders": "Kolkata Knight Riders",
  "Royal Challengers Bengaluru": "Royal Challengers Bengaluru",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
  "Mumbai Indians": "Mumbai Indians",
  "Gujarat Lions": "Gujarat Lions",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
  "Rising Pune Supergiant": "Rising Pune Supergiant",
  "Delhi Capitals": "Delhi Capitals",
  "Punjab Kings": "Punjab Kings",
  "Lucknow Super Giants": "Lucknow Super Giants",
  "Gujarat Titans": "Gujarat Titans"
}
const VENUES_VALUES = {
  "Eden Gardens": "Eden Gardens",
  "Eden Gardens, Kolkata": "Eden Gardens",
  "MA Chidambaram Stadium, Chepauk": "MA Chidambaram Stadium",
  "MA Chidambaram Stadium, Chepauk, Chennai": "MA Chidambaram Stadium",
  "MA Chidambaram Stadium": "MA Chidambaram Stadium",
  "Maharashtra Cricket Association Stadium": "Maharashtra Cricket Association Stadium",
  "Maharashtra Cricket Association Stadium, Pune": "Maharashtra Cricket Association Stadium",
  "Feroz Shah Kotla": "Arun Jaitley Stadium",
  "Arun Jaitley Stadium": "Arun Jaitley Stadium",
  "Arun Jaitley Stadium, Delhi": "Arun Jaitley Stadium",
  "Sardar Patel Stadium, Motera": "Narendra Modi Stadium",
  "Narendra Modi Stadium, Ahmedabad": "Narendra Modi Stadium",
  "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium": "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium",
  "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium, Visakhapatnam": "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium",
  "Wankhede Stadium": "Wankhede Stadium",
  "Wankhede Stadium, Mumbai": "Wankhede Stadium",
  "M Chinnaswamy Stadium": "M Chinnaswamy Stadium",
  "M.Chinnaswamy Stadium": "M Chinnaswamy Stadium",
  "M Chinnaswamy Stadium, Bengaluru": "M Chinnaswamy Stadium",
  "Punjab Cricket Association Stadium, Mohali": "Punjab Cricket Association IS Bindra Stadium",
  "Punjab Cricket Association IS Bindra Stadium, Mohali": "Punjab Cricket Association IS Bindra Stadium",
  "Punjab Cricket Association IS Bindra Stadium": "Punjab Cricket Association IS Bindra Stadium",
  "Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh": "Punjab Cricket Association IS Bindra Stadium",
  "Brabourne Stadium": "Brabourne Stadium",
  "Brabourne Stadium, Mumbai": "Brabourne Stadium",
  "Rajiv Gandhi International Stadium, Uppal": "Rajiv Gandhi International Stadium",
  "Rajiv Gandhi International Stadium": "Rajiv Gandhi International Stadium",
  "Rajiv Gandhi International Stadium, Uppal, Hyderabad": "Rajiv Gandhi International Stadium",
  "Shaheed Veer Narayan Singh International Stadium": "Shaheed Veer Narayan Singh International Stadium",
  "JSCA International Stadium Complex": "JSCA International Stadium Complex",
  "Saurashtra Cricket Association Stadium": "Saurashtra Cricket Association Stadium",
  "Green Park": "Green Park",
  "Holkar Cricket Stadium": "Holkar Cricket Stadium",
  "Sawai Mansingh Stadium": "Sawai Mansingh Stadium",
  "Sawai Mansingh Stadium, Jaipur": "Sawai Mansingh Stadium",
  "Sheikh Zayed Stadium": "Zayed Cricket Stadium",
  "Zayed Cricket Stadium, Abu Dhabi": "Zayed Cricket Stadium",
  "Dubai International Cricket Stadium": "Dubai International Cricket Stadium",
  "Sharjah Cricket Stadium": "Sharjah Cricket Stadium",
  "Dr DY Patil Sports Academy, Mumbai": "Dr DY Patil Sports Academy",
  "Barsapara Cricket Stadium, Guwahati": "Barsapara Cricket Stadium",
  "Himachal Pradesh Cricket Association Stadium, Dharamsala": "Himachal Pradesh Cricket Association Stadium",
  "Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur": "Maharaja Yadavindra Singh International Cricket Stadium",
  "Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium, Lucknow": "Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium"
}
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
            TEAMS.add(TEAMS_VALUES[values.join(' ')]);
            key = `team_${team++}`
            data[key] = TEAMS_VALUES[values.join(' ')];
            return;
          }

          if (['winner', 'toss_winner'].includes(key)) {
            data[key] = TEAMS_VALUES[values.join(' ')];
            if (!TEAMS_VALUES[values.join(' ')]) {
              console.log(`The team ${values.join(' ')} is not in the list of teams`)
            }
            return;
          }

          if (key === 'venue') {
            data[key] = VENUES_VALUES[values.join(' ')];
            return;
          }

          data[key] = values.join(' ');
        }
      })
      .on('end', () => {
        const season = parseInt(data.season);
        if (!MATCHES_INFO[season]) {
          MATCHES_INFO[season] = [];
        }
        MATCHES_INFO[season].push({ ...data, id: matchId });
        VENUES[`${data.venue}`] = { name: data.venue, city: data.city }
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
    const id = uuid();
    const query = `
      INSERT INTO players (id, name, unique_name, specialization, nationality)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      id,
      player.name,
      player.unique_name,
      player.specialization || null,
      player.nationality || null
    ];

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve({
          id: id,
          name: player.unique_name
        });
      });
    });
  });

  return Promise.all(playerInsertPromises)
    .catch(err => console.error('Error seeding players data:', err));
};

// Function to seed teams data into the database
const seedTeams = () => {
  const teamInsertPromises = Array.from(TEAMS).map(team => {
    const id = uuid();
    const query = `
      INSERT INTO teams (id, name)
      VALUES (?, ?)
    `;
    const values = [id, team]

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err) => {
        if (err) return reject(err);
        resolve({
          id: id,
          name: team
        });
      });
    });
  });

  return Promise.all(teamInsertPromises)
    .catch(err => console.error('Error seeding teams data:', err));
};

const seedMatches = async ({ seededTeams, seededSeasons, seededVenues, seededPlayers }) => {
  await Promise.all(Object.entries(MATCHES_INFO).map(async ([seasonYear, matches]) => {
    const seasonId = seededSeasons.find(season => season.year === seasonYear).id;
    await Promise.all(matches.map(async (match) => {
      const venueId = seededVenues.find(venue => venue.name === match.venue)?.id;
      const team1Id = seededTeams.find(team => team.name === match.team_1).id;
      const team2Id = seededTeams.find(team => team.name === match.team_2).id;
      const tossWinnerTeamId = seededTeams.find(team => team.name === match.toss_winner).id;
      const winnerTeamId = seededTeams.find(team => team.name === match.winner)?.id;
      const playerOfMatchId = match.player_of_match ? seededPlayers.find(player => player.name === match.player_of_match).id : null;

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
        connection.query(query, values, (err) => {
          if (err) return reject(err);
          resolve({
            id: match.id,
          });
        });
      });
    }))
  }));
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
const seedSeasons = async (seededTeams) => {
  return Promise.all((Object.entries(SEASONS).map(async ([seasonYear, winnerTeamName]) => {
    const winnerTeamId = seededTeams.find(team => team.name === winnerTeamName).id;
    const id = uuid();
    const query = `
      INSERT INTO seasons (id, year, winner_team)
      VALUES (?, ?, ?)
    `;
    const values = [id, seasonYear, winnerTeamId];

    return await new Promise((resolve, reject) => {
      connection.query(query, values, (err) => {
        if (err) return reject(err);
        resolve({
          id: id,
          year: seasonYear
        });
      });
    });
  })));
};

const seedVenues = () => {
  const venueInsertPromises = Object.values(VENUES).map(venue => {
    const id = uuid();
    const query = `
      INSERT INTO venues (id, name, city)
      VALUES (?, ?, ?)
    `;
    const values = [id, venue.name, venue.city];

    return new Promise((resolve, reject) => {
      connection.query(query, values, (err) => {
        if (err) return reject(err);
        resolve({
          id: id,
          name: venue.name
        });
      });
    });
  });

  return Promise.all(venueInsertPromises)
    .catch(err => console.error('Error seeding venues data:', err));
};

const seedDeliveries = async ({ seededPlayers }) => {
  await Promise.all(
    Object.entries(DELIVERIES).map(async ([matchId, deliveries]) => {
      await Promise.all(
        deliveries.map(async (delivery) => {
          const strikerId = seededPlayers.find(player => player.name === delivery.striker)?.id;
          const nonStrikerId = seededPlayers.find(player => player.name === delivery.non_striker)?.id;
          const bowlerId = seededPlayers.find(player => player.name === delivery.bowler)?.id;
          const playerDismissedId = delivery.player_dismissed ? seededPlayers.find(player => player.name === delivery.player_dismissed)?.id : null;
          const otherPlayerDismissedId = delivery.other_player_dismissed ? seededPlayers.find(player => player.name === delivery.other_player_dismissed)?.id : null;

          const query = `
        INSERT INTO deliveries (id, match_id, innings, ball, striker, non_striker, bowler, runs_off_bat, extras, wicket_type, player_dismissed, other_wicket_type, other_player_dismissed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
          const values = [
            uuid(),
            matchId,
            delivery.innings,
            delivery.ball,
            strikerId,
            nonStrikerId,
            bowlerId,
            delivery.runs_off_bat ? parseInt(delivery.runs_off_bat) : null,
            delivery.extras ? parseInt(delivery.extras) : null,
            delivery.wicket_type,
            playerDismissedId,
            delivery.other_wicket_type,
            otherPlayerDismissedId
          ];

          await new Promise((resolve, reject) => {
            connection.query(query, values, (err) => {
              if (err) return reject(err);
              resolve({
                id: matchId,
              });
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
  const seededPlayers = await seedPlayers();
  const seededTeams = await seedTeams();
  const seededSeasons = await seedSeasons(seededTeams);
  const seededVenues = await seedVenues();
  await seedMatches({ seededTeams, seededSeasons, seededVenues, seededPlayers });
  await seedDeliveries({ seededPlayers });

  connection.end();
};

main();
