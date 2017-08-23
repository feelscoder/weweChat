
import fs from 'fs';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';
import notifier from 'node-notifier';

let mainWindow;
let settings;
let userData = app.getPath('userData');
let imagesCacheDir = `${userData}/images`;
let voicesCacheDir = `${userData}/voices`;

[imagesCacheDir, voicesCacheDir].map(e => {
    if (!fs.existsSync(e)) {
        fs.mkdirSync(e);
    }
});

const createMainWindow = () => {
    var mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 600
    });

    mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        minWidth: 745,
        minHeight: 450,
        vibrancy: 'medium-light',
        transparent: true,
        titleBarStyle: 'hidden-inset',
        backgroundColor: 'none',
        resizable: false,
        webPreferences: {
            scrollBounce: true
        }
    });

    mainWindow.setSize(350, 460);
    mainWindow.loadURL(`file://${__dirname}/src/index.html`);

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });

    ipcMain.once('logined', event => {
        mainWindow.setResizable(true);
        mainWindow.setSize(mainWindowState.width, mainWindowState.height);
        mainWindowState.manage(mainWindow);
    });

    ipcMain.on('apply-settings', (event, args) => {
        settings = args.settings;
        mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    });

    ipcMain.on('receive-message', (event, data) => {
        var { icon, title, message } = data;
        var filename = `${imagesCacheDir}/notifier-icon.png`;

        if (settings.showNotification) {
            fs.writeFileSync(filename, icon.replace(/^data:image\/png;base64,/, ''), 'base64');

            notifier.notify({
                title,
                sound: 'Blow',
                contentImage: filename,
                message,
            });
        }
    });

    ipcMain.on('open-image', async(event, dataset, data) => {
        var filename = `${imagesCacheDir}/img_${dataset.id}`;

        fs.writeFileSync(filename, data.replace(/^data:image\/png;base64,/, ''), 'base64');
        shell.openItem(filename);
    });

    ipcMain.on('file-download', async(event, args) => {
        var filename = args.filename;

        fs.writeFileSync(filename, args.raw.replace(/^data:image\/png;base64,/, ''), {
            encoding: 'base64',
            // Overwrite file
            flag: 'wx',
        });
        event.returnValue = filename;
    });

    ipcMain.on('open-file', async(event, filename) => {
        shell.openItem(filename);
    });

    ipcMain.on('open-folder', async(event, dir) => {
        shell.openItem(dir);
    });

    ipcMain.on('open-map', (event, map) => {
        event.preventDefault();
        shell.openExternal(map);
    });
};

app.on('ready', createMainWindow);
