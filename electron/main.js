const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const dbFile = () => path.join(app.getPath("userData"), "arevs-data.json");
ipcMain.handle("db:load", () => {
  try {
    return JSON.parse(fs.readFileSync(dbFile(), "utf8"));
  } catch {
    return null;
  }
});
ipcMain.handle("db:save", (_, data) => {
  fs.writeFileSync(dbFile(), JSON.stringify(data, null, 2));
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    useContentSize: true,
    title: "Arevs Method",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win.webContents.setZoomFactor(1.1);
  });

  if (process.argv.includes("--dev")) win.loadURL("http://localhost:5174");
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
