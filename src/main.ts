import {app, autoUpdater, BrowserWindow, dialog, Menu, nativeImage, shell, Tray} from 'electron';
import {disableDVDMode, enableDVDMode} from './dvd';
import config from './config.json';
import icons from './icons.json';
import path from 'path';

// @ts-expect-error
import started from "electron-squirrel-startup";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) app.quit();

let contextMenu: Menu, windowOptions: Menu;
let tray: Tray;
let isUpdating = false;
let mainWindow: BrowserWindow;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (_event, argv) => {
        dialog.showMessageBox({
            type: 'info',
            buttons: ['Close current widget', 'Use current widget'],
            title: 'Crooms Bell Schedule',
            icon: nativeImage.createFromDataURL(icons.bigAppIcon),
            message: 'We\'re already open.',
            detail: 'The Crooms Bell Schedule is already open. You can either choose\n' +
                'to close the open widget, or use the current one.'
        }).then((returnValue) => {
            if (returnValue.response === 0) app.quit();
        });

        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }
        const lastArg = argv[argv.length - 1];
        if (lastArg) {
            mainWindow.webContents.send('handle-uri', lastArg);
        }
    })
}

const checkForUpdates = (): void => {
    if (isUpdating){
        return;
    }
    if (!app.isPackaged){
        return;
    }
    if (!contextMenu){
        return;
    }
    if (!tray){
        return;
    }

    isUpdating = true;
    contextMenu.getMenuItemById("checkForUpdatesButton").enabled = false;
    contextMenu.getMenuItemById("reopenWindowButton").enabled = false;
    tray.setContextMenu(contextMenu);

    autoUpdater.checkForUpdates();
}

if (app.isPackaged){
    const server = config.hazelUpdateURL;
    const url = `${server}/update/${process.platform}/${app.getVersion()}`;

    autoUpdater.setFeedURL({ url });

    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        dialog.showMessageBox({
            type: 'info',
            buttons: ['Restart now', 'Restart later'],
            title: 'Application Update',
            message: process.platform === 'win32' ? releaseNotes : releaseName,
            detail:
                'A new version of the Crooms Bell Schedule has been\ndownloaded. Restart the application to apply the updates.'
        }).then((returnValue) => {
            if (returnValue.response === 0) autoUpdater.quitAndInstall()
        });
        contextMenu.getMenuItemById("checkForUpdatesButton").enabled = true;
        contextMenu.getMenuItemById("reopenWindowButton").enabled = true;
        tray.setContextMenu(contextMenu);
        isUpdating = false;
        try {
            autoUpdater.off("update-not-available", showUpToDateDialog);
        }
        catch (e) {
            console.warn(e);
        }
    })

    autoUpdater.on('error', (message) => {
        console.error('There was a problem updating the application');
        console.error(message);
        /*
        dialog.showMessageBox({
          type: 'error',
          buttons: ['Ok'],
          title: 'Update Error',
          message: "There was an error while trying to update the Crooms Bell Schedule:",
          detail: message.toString()
        });
         */
        contextMenu.getMenuItemById("checkForUpdatesButton").enabled = true;
        contextMenu.getMenuItemById("reopenWindowButton").enabled = true;
        tray.setContextMenu(contextMenu);
        isUpdating = false;

    });

    // Check for updates every 1 hour.
    setInterval(()=> {
        checkForUpdates();
        autoUpdater.on("update-not-available", enableButtonsOnAutoUpdate);
    }, 3600000);
}

const enableButtonsOnAutoUpdate = (): void => {
    contextMenu.getMenuItemById("checkForUpdatesButton").enabled = true;
    contextMenu.getMenuItemById("reopenWindowButton").enabled = true;
    tray.setContextMenu(contextMenu);
    isUpdating = false;
    autoUpdater.off("update-not-available", enableButtonsOnAutoUpdate);
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 83,
        width: 365,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        alwaysOnTop: true,
        title: "Crooms Bell Schedule",
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        skipTaskbar: true,
        focusable: false,
        maximizable: false,
        closable: true,
        minimizable: false,
        hasShadow: false,
        maxHeight: 83,
        minHeight: 83,
        minWidth: 355
    });

    // and load the index.html of the app.
    /*if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }*/
    mainWindow.loadURL("http://croomssched.tech/sched");

    // Set the opacity of the app.
    mainWindow.setOpacity(0.7);

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    mainWindow.once('ready-to-show', () => {
        mainWindow.showInactive();
    });

    /*/ disable right click menu on move region
    const WM_INITMENU = 0x0116;
    mainWindow.hookWindowMessage(WM_INITMENU, () => {
        mainWindow.setEnabled(false);
        mainWindow.setEnabled(true);
    });*/

    const icon = nativeImage.createFromDataURL(icons.appIcon);

    windowOptions = Menu.buildFromTemplate([
        { label: 'DVD Mode', type: 'checkbox', click: (e) => toggleDVDMode(e) },
        { label: 'Toggle DevTools', click: () => mainWindow.webContents.openDevTools() }
    ]);

    tray = new Tray(icon);
    contextMenu = Menu.buildFromTemplate([
        { label: 'Crooms Bell Schedule v' + app.getVersion().toString(), id: 'title', click: () => aboutApp(), enabled: false },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => manualUpdate(), id: 'checkForUpdatesButton' },
        { label: 'Reopen Window', click: () => {mainWindow.close(); tray.destroy(); createWindow();}, id: 'reopenWindowButton' },
        { label: 'Window Options', type: 'submenu', id: 'windowOptionsMenu', submenu: windowOptions },
        { label: 'Open CBSH Website', click: () => siteOpen(), id: 'siteButton' },
        { label: 'Report a Bug', click: () => bugReport(), id: 'bugReportsButton' },
        { label: 'Quit', click: () => app.quit(), id: 'quitButton' }
    ]);
    tray.setToolTip('Crooms Bell Schedule');
    tray.setContextMenu(contextMenu);
};

const manualUpdate = (): void => {
    autoUpdater.on("update-not-available", showUpToDateDialog);
    checkForUpdates();
}

const siteOpen = (): void => {
    shell.openExternal("https://croomssched.tech/");
}

const showUpToDateDialog = (): void => {
    dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        title: 'No Updates Available',
        message: "You're all set!",
        detail: "The application is up-to-date."
    })
    contextMenu.getMenuItemById("checkForUpdatesButton").enabled = true;
    contextMenu.getMenuItemById("reopenWindowButton").enabled = true;
    tray.setContextMenu(contextMenu);
    isUpdating = false;
    autoUpdater.off("update-not-available", showUpToDateDialog);
}

const bugReport = (): void => {
    shell.openExternal("https://github.com/ajcoolcat/BellSchedOverlay/issues");
}

const toggleDVDMode = (event: any) => {
    const toggle = event.checked;

    toggle === true ? enableDVDMode(mainWindow) : disableDVDMode();
}

const aboutApp = () => {
    const aboutWindow = new BrowserWindow({
        height: 600,
        width: 506,
        title: "About Crooms Bell Schedule",
        show: false,
        autoHideMenuBar: true,
        maximizable: false,
        closable: true,
        minimizable: false,
        resizable: false
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        aboutWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '/about');
    } else {
        aboutWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/about.html`));
    }

    aboutWindow.once('ready-to-show', () => aboutWindow.show());
}

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
    // On OS X, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        checkForUpdates();
    }
});