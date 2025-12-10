const { app, BrowserWindow, Tray, Menu, session, systemPreferences, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

async function checkMediaAccess() {
  if (process.platform !== 'darwin') return true;
  
  try {
    const status = await systemPreferences.getMediaAccessStatus('microphone');
    console.log("Current Microphone Access Status:", status);
    
    if (status === 'not-determined') {
      const success = await systemPreferences.askForMediaAccess('microphone');
      return success;
    }
    return status === 'granted';
  } catch (error) {
    console.error("Could not check media access:", error);
    return false;
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  const hasIcon = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: hasIcon ? iconPath : undefined, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableBlinkFeatures: 'RTCWebAudioMediaStream', 
    },
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath).catch(e => {
    console.error("Failed to load index.html. Did you run 'npm run build'?", e);
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    if (params.isEditable || params.selectionText.length > 0) {
      const menu = Menu.buildFromTemplate([
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' },
        { role: 'selectAll' }
      ]);
      menu.popup({ window: mainWindow });
    }
  });
}

function setupPermissions() {
  // 1. General Permission Handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      console.log(`Denied permission request: ${permission}`);
      callback(false);
    }
  });

  // 2. Display Media Handler (Auto-Select Screen for System Audio)
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((sources) => {
        // Grant access to the first screen available.
        // The 'loopback' audio option is CRITICAL for capturing system audio on Windows 
        // without user interaction.
        callback({ video: sources[0], audio: 'loopback' });
      })
      .catch((error) => {
        console.error("Error auto-selecting screen:", error);
        callback(null);
      });
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    return allowedPermissions.includes(permission);
  });
}

function createMenu() {
  const template = [
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const hasIcon = fs.existsSync(iconPath);
  
  try {
    tray = new Tray(hasIcon ? iconPath : ''); 
    tray.setToolTip('Smart Note AI');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]));
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
  } catch (e) {
    console.warn("Tray icon error:", e);
  }
}

app.whenReady().then(async () => {
  setupPermissions(); // Initialize global permissions & handlers
  await checkMediaAccess();
  createMenu();
  createWindow();
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // app.quit(); // Keep running in background
  }
});