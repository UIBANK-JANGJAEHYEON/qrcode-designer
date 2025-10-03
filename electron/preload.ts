import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  saveImage: (dataUrl: string) => ipcRenderer.invoke("save-image", dataUrl),
});
