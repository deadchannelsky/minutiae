const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

let isFormSaved = false; // Flag to track if form is saved
let isQuitting = false; // Flag to track if the app is quitting
let mainWindow; // Main application window
let splashWindow; // Splash screen window

// Load settings
let settings = {};
const settingsPath = path.join(__dirname, 'settings.json');
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} else {
  settings = { pathToMinutes: '.' };
}

// Handle form save state messages from renderer process
ipcMain.on('form-save-state', (event, state) => {
  isFormSaved = state;
});

// Load meeting minutes from the specified path
ipcMain.on('load-minutes', (event) => {
  const mainWindow = BrowserWindow.getFocusedWindow();
  const minutesPath = settings.pathToMinutes || '.';
  if (!fs.existsSync(minutesPath)) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      buttons: ['OK'],
      title: 'Error',
      message: `The path ${minutesPath} does not exist. Please update your settings.`
    });
    return;
  }
  const files = fs.readdirSync(minutesPath).filter(file => file.endsWith('.txt'));
  if (files.length === 0) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['OK'],
      title: 'No Files',
      message: 'No .txt files found in the specified directory.'
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
    const fileContent = fs.readFileSync(path.join(minutesPath, selectedFile), 'utf-8');
    createMinutesWindow(fileContent);
  }
});

// Handle application exit request from renderer process
ipcMain.on('exit-application', () => {
  isQuitting = true;
  app.quit();
});

// Handle settings window request from renderer process
ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// Load settings to renderer process
ipcMain.on('request-settings', (event) => {
  event.sender.send('load-settings', settings);
});

// Save settings from renderer process
ipcMain.on('save-settings', (event, newSettings) => {
  settings = newSettings;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
});

// Create main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Minutiae",
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: false
  });

  //mainWindow.setMenu(null); // Hide the menu bar
  mainWindow.loadFile('index.html');
  //mainWindow.removeMenu();

  // Handle window close event to check for unsaved changes
  mainWindow.on('close', (e) => {
    if (!isFormSaved && !isQuitting) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        title: 'Confirm',
        message: 'You have unsaved changes. Do you want to save them before exiting?'
      });
      if (choice === 0) {
        mainWindow.webContents.executeJavaScript('saveForm();', true).then(() => {
          isQuitting = true;
          app.quit();
        });
      } else if (choice === 1) {
        isQuitting = true;
        app.quit();
      }
    }
  });
}

// Create settings window
function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: 'Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: false
  });

  //settingsWindow.setMenu(null); // Hide the menu bar
  settingsWindow.loadFile('settings.html');
}

// Create splash screen window
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  splashWindow.loadFile('splash.html');

  // Close splash screen and open main window after 4 seconds
  setTimeout(() => {
    splashWindow.close();
    createMainWindow();
  }, 4000);
}

// Create a new window to display and edit minutes
function createMinutesWindow(fileContent) {
  const minutesWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Edit Minutes',
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: false
  });

  //minutesWindow.setMenu(null); // Hide the menu bar
  minutesWindow.loadFile('editor.html'); // Load the editor HTML file

  // Send the file content to the editor window
  minutesWindow.webContents.on('did-finish-load', () => {
    minutesWindow.webContents.send('load-file-content', fileContent);
  });
}

// App ready event to create splash window
app.on('ready', createSplashWindow);

// Handle all windows closed event
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app activation (macOS specific)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Handle app before quit event to manage quitting state
app.on('before-quit', (event) => {
  if (!isQuitting) {
    event.preventDefault();
    BrowserWindow.getAllWindows().forEach(window => {
      window.close();
    });
  }
});
