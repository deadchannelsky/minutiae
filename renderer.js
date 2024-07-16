const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let isFormSaved = false;

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

document.getElementById('addOldBusiness').addEventListener('click', () => {
  document.getElementById('oldBusinessContainer').appendChild(createOldBusinessSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
});

document.getElementById('addNewBusiness').addEventListener('click', () => {
  document.getElementById('newBusinessContainer').appendChild(createNewBusinessSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
});

document.getElementById('addMotion').addEventListener('click', () => {
  document.getElementById('motionsContainer').appendChild(createMotionSection());
  isFormSaved = false;
  ipcRenderer.send('form-save-state', isFormSaved);
});

document.getElementById('minutesForm').addEventListener('submit', (event) => {
  event.preventDefault();
  saveForm();
});

function saveForm() {
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
  const filePath = path.join(__dirname, `${currentDate}${currentTime}RCCMinutes.txt`);

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
    alert(`Minutes saved to ${currentDate}${currentTime}RCCMinutes.txt`);
    isFormSaved = true;
    ipcRenderer.send('form-save-state', isFormSaved);
  });
}

function loadMinutes() {
  ipcRenderer.send('load-minutes');
}

ipcRenderer.on('display-minutes', (event, fileContent) => {
  const displayWindow = window.open('', 'Minutes Display', 'width=800,height=600');
  displayWindow.document.write('<pre>' + fileContent + '</pre>');
});
