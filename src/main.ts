import { app, BrowserWindow } from 'electron';
import path from 'path';
import electronReload from 'electron-reload';

electronReload(path.join(__dirname), {
  electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
  hardResetMethod: 'exit',
});


let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// macOS 특성에 맞게 앱 활성화 이벤트 핸들링
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 앱 종료 처리
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
