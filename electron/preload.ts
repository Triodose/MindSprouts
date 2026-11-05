import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  copyNodes: (text: string) => ipcRenderer.invoke('nodes:copy', text),
  readNodes: () => ipcRenderer.invoke('nodes:paste'),
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:requestClose', listener);
    ipcRenderer.send('workspace:rendererReady', true);
    return () => { ipcRenderer.removeListener('workspace:requestClose', listener); ipcRenderer.send('workspace:rendererReady', false); };
  },
  closeReady: (success: boolean) => ipcRenderer.send('workspace:closeReady', success),
  getWorkspace: () => ipcRenderer.invoke('workspace:info'),
  selectWorkspace: () => ipcRenderer.invoke('workspace:select'),
  saveCopy: (title: string, content: any) => ipcRenderer.invoke('workspace:saveCopy', title, content),
  openWorkspace: () => ipcRenderer.invoke('workspace:open'),
  refreshWorkspace: () => ipcRenderer.invoke('workspace:refresh'),
  migrateLegacy: () => ipcRenderer.invoke('workspace:migrate'),
  // Mind map documents APIs
  getMaps: () => ipcRenderer.invoke('db:getMaps'),
  saveMap: (id: string, title: string, content: any, updatedAt: string) => 
    ipcRenderer.invoke('db:saveMap', id, title, content, updatedAt),
  deleteMap: (id: string) => ipcRenderer.invoke('db:deleteMap', id),
  
  // Settings APIs (for auto_layout, active_map_id, map_transforms, maps_order)
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
});
