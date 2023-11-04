require('dotenv').config();
const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');

const API_KEY = process.env.API_KEY;
const CSE_ID = process.env.CSE_ID;
const QUERY = process.env.QUERY;
const CSV_FILE_PATH = process.env.CSV_FILE_PATH;

const csvWriter = createObjectCsvWriter({
  path: CSV_FILE_PATH,
  header: [
    { id: 'title', title: 'Title' },
    { id: 'link', title: 'Link' }
  ]
});

const googleSearch = async (query, startIndex, numResults) => {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: API_KEY,
        cx: CSE_ID,
        q: query,
        start: startIndex,
        num: numResults // Ensure this is 19 or less
      }
    });
    return response.data.items || [];
  } catch (error) {
    // More descriptive error handling
    if (error.response) {
      console.error('Error occurred while fetching search results:', error.message);
      console.error('Status code:', error.response.status);
      console.error('Status text:', error.response.statusText);
      if (error.response.data && error.response.data.error) {
        console.error('Error details:', error.response.data.error.errors);
        console.error('Error message:', error.response.data.error.message);
      }
    } else if (error.request) {
      console.error('The request was made but no response was received');
    } else {
      console.error('Error setting up the request:', error.message);
    }
    return []; // return an empty array or handle accordingly
  }
};

const saveResultsToCsv = async (results) => {
  const records = results.map(item => ({ title: item.title, link: item.link }));
  await csvWriter.writeRecords(records);
  console.log(`Search results saved to ${CSV_FILE_PATH}`);
};

(async () => {
  const totalResults = 100; // Total results you want
  const batchSize = 10; // Results per request
  let results = [];
  let queryCount = 0; 

  while (results.length < totalResults) {
    const searchResults = await googleSearch(QUERY, startIndex, batchSize);
    results = results.concat(searchResults);
    startIndex += searchResults.length; // Increment startIndex by the number of results fetched
    queryCount++; // Increment the query count

    // If the last set of results is smaller than the batchSize, indicating no more results, then break
    if (searchResults.length < batchSize) {
      break;
    }

  await saveResultsToCsv(results);

  console.log(`Total queries made: ${queryCount}`);
})();
