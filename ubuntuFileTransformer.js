const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const inputFile = 'ubuntuDB.csv'; // Replace with your input file path
const outputFile = 'output.csv';
const dialogueLimit = 10; // Limit to the number of dialogues to process

const csvWriter = createObjectCsvWriter({
    path: outputFile,
    header: [
        { id: 'folderDialogueID', title: 'summary' },
        { id: 'role', title: 'role' },
        { id: 'text', title: 'text' }
    ]
});

let currentDialogueID = null;
let dialogueCounter = 0;
let firstSpeaker = null;
let secondSpeaker = null;
let records = [];

fs.createReadStream(inputFile)
    .pipe(csv())
    .on('data', (row) => {
        if (dialogueCounter >= dialogueLimit) {
            return;
        }

        if (currentDialogueID !== row.dialogueID) {
            if (currentDialogueID !== null) {
                // A new dialogue starts, so increment the counter.
                dialogueCounter++;
            }
            if (dialogueCounter >= dialogueLimit) {
                return;
            }
            currentDialogueID = row.dialogueID;
            firstSpeaker = row.from;
            secondSpeaker = null;
        }

        if (!secondSpeaker && row.from !== firstSpeaker) {
            secondSpeaker = row.from;
        }

        const folderDialogueID = `${row.folder} - ${row.dialogueID}`;
        const role = row.from === firstSpeaker ? 'CUSTOMER' : 'AGENT';
        
        records.push({
            folderDialogueID: folderDialogueID,
            role: role,
            text: row.text
        });
    })
    .on('end', () => {
        csvWriter
            .writeRecords(records)
            .then(() => console.log('The CSV file was written successfully'))
            .catch((err) => console.error('Error writing CSV file:', err));
    })
    .on('error', (err) => console.error('Error reading input file:', err));
