const { contextBridge } = require('electron')

// Expose minimal desktop context to the renderer — no Node.js leakage
contextBridge.exposeInMainWorld('pollcityDesktop', {
  platform: process.platform,
})
