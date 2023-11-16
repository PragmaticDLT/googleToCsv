require('dotenv').config();
const { getJson } = require("serpapi");
const { createObjectCsvWriter } = require('csv-writer');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const API_KEY = "1ddaef1b7638fc20497498a71cabfdd6d4aaea2734b121ed0ff9403e1ef750b3";

const saveResultsToCsv = async (results, filePath) => {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'title', title: 'Title' },
      { id: 'link', title: 'Link' },
      { id: 'snippet', title: 'Snippet' }
    ]
  });

  const records = results.map(item => ({ title: item.title, link: item.link, snippet: item.snippet }));
  await csvWriter.writeRecords(records);
  console.log(`Search results saved to ${filePath}`);
};

const fetchAndSaveResults = async (start) => {
  try {
    const response = await getJson({
      api_key: API_KEY,
      engine: "duckduckgo",
      q: "inurl:\"servicedesk/customer/portals\"",
      kl: "us-en",
      start: start.toString()
    });

    if (response.organic_results && response.organic_results.length > 0) {
      const fileName = `search_results_${uuidv4()}.csv`;
      await saveResultsToCsv(response.organic_results, fileName);
      return response.organic_results.length;
    } else {
      return 0; // No more results
    }
  } catch (error) {
    console.error('Error fetching results:', error.message);
    return 0; // Handle error by stopping further requests
  }
};

const combineCsvFiles = async () => {
    const directoryPath = path.join(__dirname); // Directory where your script is running
    const combinedFileName = path.join(directoryPath, `combined_search_results_${uuidv4()}.csv`);
    let combinedData = '';
  
    fs.readdirSync(directoryPath).forEach(file => {
      if (file.startsWith('search_results_') && file.endsWith('.csv')) {
        const data = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        // Skip the header for all but the first file
        if (combinedData !== '') {
          combinedData += data.split('\n').slice(1).join('\n');
        } else {
          combinedData = data;
        }
      }
    });
  
    fs.writeFileSync(combinedFileName, combinedData);
    console.log(`Combined CSV file created: ${combinedFileName}`);
};

const filterAndSaveCsv = async (inputFileName, outputFileName) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, inputFileName))
      .pipe(csv())
      .on('data', (data) => {
        try {
          if (data.Link && data.Link.includes('servicedesk/customer/portals') && 
              !data.Title.toLowerCase().includes('log in') &&
              !data.Title.toLowerCase().includes('login')) {
              results.push({ Title: data.Title, Link: data.Link, Snippet: data.Snippet });
          }
        } catch (err) {
          console.error(`Error processing row: ${JSON.stringify(data)}`, err);
        }
      })
      .on('end', async () => {
        const csvWriter = createObjectCsvWriter({
          path: path.join(__dirname, outputFileName),
          header: [
            { id: 'Title', title: 'Title' },
            { id: 'Link', title: 'Link' },
            { id: 'Snippet', title: 'Snippet' }
          ]
        });
        await csvWriter.writeRecords(results);
        console.log(`Filtered results saved to ${outputFileName}`);
      });
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes('combine-csv')) {
    await combineCsvFiles();
  } else if (args.includes('filter-csv')) {
    const inputFileName = args[1] || 'combined_search_results.csv';
    const outputFileName = args[2] || 'filtered_search_results.csv';
    await filterAndSaveCsv(inputFileName, outputFileName);
  } else {
    (async () => {
      let start = 747;
      let fetchedResults;
      let iterationCount = 0;
    
      do {
        console.log(`Fetching results starting from index: ${start}`);
        fetchedResults = await fetchAndSaveResults(start);
        if (fetchedResults > 0) {
          start += fetchedResults;
        }
        iterationCount++;
      } while (fetchedResults > 0);

      console.log(`All results fetched and saved. Total iterations: ${iterationCount}`);
    })();
  }
};

main().catch(console.error);

