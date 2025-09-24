// electron.js
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false, // аюулгүй
    },
  });

  // dist доторх локал HTML-ээ ачаална
  win.loadFile(path.join(__dirname, "dist", "XFinance.html"));

  // Хөгжүүлэлтэд хэрэггүй болсон үед үүнийг комментлоорой
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
