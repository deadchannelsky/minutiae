const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let isFormSaved = false;

ipcMain.on('form-save-state', (event, state) => {
  isFormSaved = state;
});

ipcMain.on('load-minutes', (event) => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.txt'));
  if (files.length === 0) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['OK'],
      title: 'No Files',
      message: 'No .txt files found in the root directory.'
    });
    return;
  }

  const fileSelection = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: files,
    title: 'Select Minutes File',
    message: 'Select a .txt file to load its contents.'
  });

  if (fileSelection >= 0 && fileSelection < files.length) {
    const selectedFile = files[fileSelection];
    const fileContent = fs.readFileSync(path.join(__dirname, selectedFile), 'utf-8');
    event.sender.send('display-minutes', fileContent);
  }
});

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Minutiae",
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (e) => {
    if (!isFormSaved) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        title: 'Confirm',
        message: 'You have unsaved changes. Do you want to save them before exiting?'
      });
      if (choice === 0) {
        mainWindow.webContents.executeJavaScript('saveForm();', true).then(() => {
          app.quit();
        });
      } else if (choice === 1) {
        app.quit();
      }
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', (event) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    event.preventDefault();
    windows[0].close();
  }
});
