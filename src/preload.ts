import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  selectImage: () => ipcRenderer.invoke('select-image')
});
