const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const datasetDir = './dataset';
const data = {};

/**
 * @param {String} fileName
 * @returns {Number}
 */
const getMatchId = (fileName) => {
  if (fileName.includes('info')) {
    fileName = fileName.split('_')
  } else {
    fileName = fileName.split('.')
  }

  return parseInt(fileName[0]);
};

// Read files from dataset directory and sort by match ID
const matchesFiles = fs.readdirSync(datasetDir)
  .filter(file => file.endsWith('info.csv'))
  .sort((a, b) => getMatchId(a) - getMatchId(b));

const playersFile = fs.readFileSync(path.join(datasetDir, 'players.csv'), 'utf8')

// // Function to process a single file
const processFile = (file) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(datasetDir, file);
    const matchId = getMatchId(file);
    data[matchId] = {};

    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        const [type, key, ...values] = Object.values(row);
        if (type === 'info') {
          if (!data[matchId][key]) {
            data[matchId][key] = values.length > 1 ? values : values[0];
          } else if (Array.isArray(data[matchId][key])) {
            data[matchId][key].push(values.length > 1 ? values : values[0]);
          } else {
            data[matchId][key] = [data[matchId][key], values.length > 1 ? values : values[0]];
          }
        }
      })
      .on('end', () => {
        console.log(`Processed file: ${file}`);
        resolve();
      })
      .on('error', (error) => {
        console.error(`Error processing file: ${file}`, error);
        reject(error);
      });
  });
};

// Main function to process all files
const processFiles = async () => {
  for (const file of matchesFiles) {
    await processFile(file);
  }

  console.log('All files processed.');
  console.log(JSON.stringify(data, null, 2));
};

processFiles();
