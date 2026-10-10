const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('db', {
  load: () => ipcRenderer.invoke('db:load'),
  clearLegacyData: () => ipcRenderer.invoke('db:clear-legacy'),
  setZoomFactor: (factor) => ipcRenderer.invoke('window:set-zoom-factor', factor),
})
