import { app, BrowserWindow, Tray, Menu, nativeImage, autoUpdater, dialog } from 'electron';
import config from "./config.json";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
if (app.isPackaged){
  const server = config.hazelUpdateURL;
  const url = `${server}/update/${process.platform}/${app.getVersion()}`;

  autoUpdater.setFeedURL({ url });

  function checkForUpdates() {
    
      autoUpdater.checkForUpdates();
  
  }


  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {

    dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail:
        'A new version of the Crooms Bell Schedule has been downloaded. Restart the application to apply the updates.'
    }).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall()
    });

  })

  autoUpdater.on('error', (message) => {
    console.error('There was a problem updating the application');
    console.error(message);
  });

  checkForUpdates();

  // Check for updates every 1 hour.
  setInterval(()=> {
    checkForUpdates();
  }, 3600000);

}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 82,
    width: 380,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true
    },
    alwaysOnTop: true,
    title: "Crooms Bell Schedule",
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    focusable: false,
    maximizable: false,
    closable: true,
    minimizable: false
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  
  // Set the opacity of the app.
  mainWindow.setOpacity(0.7);

  // comment this out in production!!!!!
  mainWindow.webContents.openDevTools();

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.showInactive()
  });
  const icon = nativeImage.createFromDataURL("data:image/png;base64,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");
  const tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', type: 'normal', click: () => {app.quit()} }
  ]);
  tray.setToolTip('Crooms Bell Schedule');
  tray.setContextMenu(contextMenu);
};



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
