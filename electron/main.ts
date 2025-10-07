import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: path.join(__dirname, "../public/assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // preload 연결
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// 앱 준비 후 윈도우 생성
app.whenReady().then(createWindow);

// macOS 재활성화 대응
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 모든 윈도우 종료 시 종료
app.on("window-all-closed", () => {
  app.quit();
  process.exit(0);
});

// ------------------- IPC 핸들러 -------------------
// Renderer에서 'save-image' 호출 시 이미지 저장
ipcMain.handle("save-image", async (_, dataUrl: string) => {
  try {
    const buffer = Buffer.from(dataUrl.split(",")[1], "base64");

    const { filePath } = await dialog.showSaveDialog({
      title: "이미지 저장",
      defaultPath: "qr-template.png",
      filters: [{ name: "PNG", extensions: ["png"] }],
    });

    if (!filePath) return { success: false };

    await fs.promises.writeFile(filePath, buffer);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err };
  }
});
