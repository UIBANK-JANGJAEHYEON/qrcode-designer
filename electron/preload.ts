import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  saveImage: (dataUrl: string, format: "png" | "jpg" | "pdf", defaultFileName?: string) =>
    ipcRenderer.invoke("save-image", dataUrl, format, defaultFileName),
});