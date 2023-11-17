const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const inputFile = 'ubuntuDB.csv'; // Replace with your input file path
const outputFile = 'output.csv';
const dialogueLimit = 50; // Limit to the number of dialogues to process

let currentDialogueID = null;
let dialogueCounter = 0;
let commentCounter = 0;
let maxComments = 0;
let currentData = {};

const dataBuffer = [];

function addComment(role, text) {
  const commentLabel = `${role}${Math.floor((commentCounter + 1) / 2)}`;
  currentData[commentLabel] = text;
  commentCounter++;
}

console.log('Starting processing...');

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    if (dialogueCounter >= dialogueLimit) return;

    if (currentDialogueID !== row.dialogueID) {
      if (currentDialogueID !== null) {
        maxComments = Math.max(maxComments, commentCounter);
        dataBuffer.push(currentData); // Push the completed dialogue
      }

      currentDialogueID = row.dialogueID;
      currentData = { Summary: row.dialogueID, Description: row.text };
      commentCounter = 0;

      dialogueCounter++;
    } else {
      addComment(commentCounter % 2 === 0 ? 'Customer' : 'Agent', row.text);
    }
  })
  .on('end', () => {
    if (dialogueCounter >= dialogueLimit) {
      maxComments = Math.max(maxComments, commentCounter); // Check for the last dialogue
      if (currentData.Summary) {
        dataBuffer.push(currentData); // Push the last dialogue if not pushed
      }

      console.log('Processing complete. Writing to file...');
      const headers = ['Summary', 'Description'];
      for (let i = 0; i < Math.ceil(maxComments / 2); i++) {
        headers.push(`Customer${i + 1}`);
        headers.push(`Agent${i + 1}`);
      }

      const csvWriter = createObjectCsvWriter({
        path: outputFile,
        header: headers.map(h => ({ id: h, title: h }))
      });

      csvWriter.writeRecords(dataBuffer)
        .then(() => console.log('CSV file was written successfully'))
        .catch(err => console.error('Error writing record:', err));
    }
  })
  .on('error', (err) => {
    console.error('Error during file processing:', err);
  });

console.log('Script ended.');
