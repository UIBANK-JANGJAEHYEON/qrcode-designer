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
ipcMain.handle("save-image", async (event, dataUrl: string, format: "png" | "jpg" | "pdf", defaultFileName?: string) => {
  const { filePath } = await dialog.showSaveDialog({
    title: "保存",
    defaultPath: defaultFileName ? `${defaultFileName}.${format}` : `qr_code.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });

  if (!filePath) return { success: false };

  try {
    // dataURL -> Buffer
    const base64Data = dataUrl.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: err };
  }
});