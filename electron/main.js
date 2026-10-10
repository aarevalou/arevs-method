const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const dbFile = () => path.join(app.getPath("userData"), "arevs-data.json");
ipcMain.handle("db:load", () => {
  if (!fs.existsSync(dbFile())) return null;
  try {
    return JSON.parse(fs.readFileSync(dbFile(), "utf8"));
  } catch (error) {
    throw new Error(`No se pudieron recuperar los datos locales existentes: ${error.message}`);
  }
});
ipcMain.handle("db:clear-legacy", () => {
  if (fs.existsSync(dbFile())) fs.unlinkSync(dbFile());
  return true;
});
ipcMain.handle("window:set-zoom-factor", (event, factor) => {
  if (!Number.isFinite(factor) || factor < 0.8 || factor > 1.5) {
    throw new Error("El zoom debe estar entre 80 % y 150 %.");
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error("No se encontró la ventana activa.");
  win.webContents.setZoomFactor(factor);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    useContentSize: true,
    title: "Arevs Method",
    icon: path.join(__dirname, "../src/assets/logo.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.argv.includes("--dev")) win.loadURL("http://localhost:5174");
  else win.loadFile(path.join(app.getAppPath(), "release/renderer/index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
