const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { convertHtmlToRtf } = require('html-to-rtf');

// Load settings from settings file
let settings = {};
const settingsPath = path.join(__dirname, 'settings.json');
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} else {
  settings = { pathToMinutes: '.' };
}

let isFormSaved = false; // Flag to track if form is saved
let quill; // Quill editor instance

// Create old business section for the meeting minutes form
function createOldBusinessSection() {
  const section = document.createElement('div');
  section.classList.add('subsection');
  section.innerHTML = `
    <label for="oldDescription">Description:</label>
    <textarea name="oldDescription"></textarea><br>
    <label for="oldDecision">Decision:</label>
    <textarea name="oldDecision"></textarea><br>
  `;
  return section;
}

// Create new business section for the meeting minutes form
function createNewBusinessSection() {
  const section = document.createElement('div');
  section.classList.add('subsection');
  section.innerHTML = `
    <label for="newDescription">Description:</label>
    <textarea name="newDescription"></textarea><br>
    <label for="newDecision">Decision:</label>
    <textarea name="newDecision"></textarea><br>
  `;
  return section;
}

// Create motion section for the meeting minutes form
function createMotionSection() {
  const section = document.createElement('div');
  section.classList.add('subsection');
  section.innerHTML = `
    <label for="motion">Motion:</label>
    <input type="text" name="motion"><br>
    <label for="mover">Mover:</label>
    <input type="text" name="mover"><br>
    <label for="second">Second:</label>
    <input type="text" name="second"><br>
    <label for="description">Description:</label>
    <textarea name="description"></textarea><br>
    <label for="notes">Notes:</label>
    <textarea name="notes"></textarea><br>
    <label for="status">Status:</label>
    <select name="status">
      <option value="Pass">Pass</option>
      <option value="Fail">Fail</option>
    </select><br>
  `;
  return section;
}

// DOM content loaded event listener to set up form event handlers
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM content loaded, setting up event listeners...");

  document.getElementById('addOldBusiness').removeEventListener('click', addOldBusinessHandler);
  document.getElementById('addNewBusiness').removeEventListener('click', addNewBusinessHandler);
  document.getElementById('addMotion').removeEventListener('click', addMotionHandler);
  document.getElementById('minutesForm').removeEventListener('submit', submitFormHandler);
  document.getElementById('save-button').removeEventListener('click', saveAsRTF);

  document.getElementById('addOldBusiness').addEventListener('click', addOldBusinessHandler);
  document.getElementById('addNewBusiness').addEventListener('click', addNewBusinessHandler);
  document.getElementById('addMotion').addEventListener('click', addMotionHandler);
  document.getElementById('minutesForm').addEventListener('submit', submitFormHandler);
  document.getElementById('save-button').addEventListener('click', saveAsRTF);

  if (!quill) {
    quill = new Quill('#editor-container', {
      theme: 'snow'
    });
    console.log("Quill editor initialized.");
  }
});

// Event handler functions
function addOldBusinessHandler() {
  document.getElementById('oldBusinessContainer').appendChild(createOldBusinessSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
  console.log("Old business section added.");
}

function addNewBusinessHandler() {
  document.getElementById('newBusinessContainer').appendChild(createNewBusinessSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
  console.log("New business section added.");
}

function addMotionHandler() {
  document.getElementById('motionsContainer').appendChild(createMotionSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
  console.log("Motion section added.");
}

function submitFormHandler(event) {
  event.preventDefault();
  saveForm();
}

// Save the meeting minutes form data
function saveForm() {
  console.log("Saving form data...");
  const date = document.getElementById('date').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const location = document.getElementById('location').value;
  const present = document.getElementById('present').value;
  const absent = document.getElementById('absent').value;
  const treasurerPresenter = document.getElementById('treasurerPresenter').value;
  const treasurerSummary = document.getElementById('treasurerSummary').value;
  const treasurerKeyPoints = document.getElementById('treasurerKeyPoints').value;
  const eldersPresenter = document.getElementById('eldersPresenter').value;
  const eldersSummary = document.getElementById('eldersSummary').value;
  const eldersKeyPoints = document.getElementById('eldersKeyPoints').value;
  const announcements = document.getElementById('announcements').value;
  const nextMeeting = document.getElementById('nextMeeting').value;

  let oldBusiness = '';
  const oldBusinessSections = document.querySelectorAll('#oldBusinessContainer .subsection');
  oldBusinessSections.forEach((section, index) => {
    const description = section.querySelector('textarea[name="oldDescription"]').value;
    const decision = section.querySelector('textarea[name="oldDecision"]').value;

    oldBusiness += `
    Old Business ${index + 1}:
    Description: ${description}
    Decision: ${decision}
    `;
  });

  let newBusiness = '';
  const newBusinessSections = document.querySelectorAll('#newBusinessContainer .subsection');
  newBusinessSections.forEach((section, index) => {
    const description = section.querySelector('textarea[name="newDescription"]').value;
    const decision = section.querySelector('textarea[name="newDecision"]').value;

    newBusiness += `
    New Business ${index + 1}:
    Description: ${description}
    Decision: ${decision}
    `;
  });

  let motions = '';
  const motionSections = document.querySelectorAll('#motionsContainer .subsection');
  motionSections.forEach((section, index) => {
    const motion = section.querySelector('input[name="motion"]').value;
    const mover = section.querySelector('input[name="mover"]').value;
    const second = section.querySelector('input[name="second"]').value;
    const description = section.querySelector('textarea[name="description"]').value;
    const notes = section.querySelector('textarea[name="notes"]').value;
    const status = section.querySelector('select[name="status"]').value;

    motions += `
    Motion ${index + 1}:
    Motion: ${motion}
    Mover: ${mover}
    Second: ${second}
    Description: ${description}
    Notes: ${notes}
    Status: ${status}
    `;
  });

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const currentTime = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const filePath = path.join(settings.pathToMinutes, `${currentDate}${currentTime}RCCMinutes.txt`);

  // Save the form data to a text file
  fs.writeFile(filePath, `
    RCC Elders Meeting Minutes

    Date: ${date}
    Time: ${startTime} - ${endTime}
    Location: ${location}

    Attendance
    Present:
    ${present}

    Absent:
    ${absent}

    Reports
    Treasurer's Report:
    Presenter: ${treasurerPresenter}
    Summary: ${treasurerSummary}
    Key Points: ${treasurerKeyPoints}

    Elders Report:
    Presenter: ${eldersPresenter}
    Summary: ${eldersSummary}
    Key Points: ${eldersKeyPoints}

    Old Business:
    ${oldBusiness}

    New Business:
    ${newBusiness}

    Other Business
    Announcements:
    ${announcements}

    Next Meeting Date:
    ${nextMeeting}

    Motions:
    ${motions}
  `, (err) => {
    if (err) {
      return console.error(err);
    }
    alert(`Minutes saved to ${filePath}`);
    isFormSaved = true;
    ipcRenderer.send('form-save-state', isFormSaved);
  });
}

// Load meeting minutes file
function loadMinutes() {
  ipcRenderer.send('load-minutes');
}

// Display meeting minutes content in Quill editor
ipcRenderer.on('display-minutes', (event, fileContent) => {
  quill.clipboard.dangerouslyPasteHTML(0, fileContent.replace(/\n/g, '<br>')); // Load file content
  console.log("Minutes content loaded into Quill editor.");
});

// Function to save content as RTF
function saveAsRTF() {
  console.log("Save as RTF button clicked.");
  if (!quill) {
    console.error("Quill editor not initialized.");
    return;
  }

  const htmlContent = quill.root.innerHTML; // Get HTML content
  console.log("HTML content from Quill editor:", htmlContent);

  const rtfContent = convertHtmlToRtf(htmlContent); // Convert HTML to RTF
  console.log("Converted RTF content:", rtfContent);

  const filePath = getSaveFilePath(); // Generate file path with .rtf extension
  console.log("File path for saving RTF:", filePath);

  fs.writeFileSync(filePath, rtfContent); // Save RTF content to file
  console.log(`Formatted minutes saved to ${filePath}`);
  alert(`Formatted minutes saved to ${filePath}`);
}

// Function to generate file path with .rtf extension
function getSaveFilePath() {
  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const currentTime = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  return path.join(settings.pathToMinutes, `${currentDate}${currentTime}RCCMinutes.rtf`);
}

// Remove event listeners to prevent duplication
document.getElementById('addOldBusiness').removeEventListener('click', addOldBusinessHandler);
document.getElementById('addNewBusiness').removeEventListener('click', addNewBusinessHandler);
document.getElementById('addMotion').removeEventListener('click', addMotionHandler);
document.getElementById('minutesForm').removeEventListener('submit', submitFormHandler);
document.getElementById('save-button').removeEventListener('click', saveAsRTF);

// Add event listeners
document.getElementById('addOldBusiness').addEventListener('click', addOldBusinessHandler);
document.getElementById('addNewBusiness').addEventListener('click', addNewBusinessHandler);
document.getElementById('addMotion').addEventListener('click', addMotionHandler);
document.getElementById('minutesForm').addEventListener('submit', submitFormHandler);
document.getElementById('save-button').addEventListener('click', saveAsRTF);

// Initialize Quill editor
if (!quill) {
  quill = new Quill('#editor-container', {
    theme: 'snow'
  });
  console.log("Quill editor initialized.");
}
