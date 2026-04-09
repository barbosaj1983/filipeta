const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printAPI', {
    onDadosFilipeta: (callback) => ipcRenderer.on('dados-filipeta', (_, data) => callback(data)),
    printReady: () => ipcRenderer.send('print-ready')
});

console.log('preload-print.js carregado');
