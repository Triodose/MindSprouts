import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Mind map documents APIs
  getMaps: () => ipcRenderer.invoke('db:getMaps'),
  saveMap: (id: string, title: string, content: any, updatedAt: string) => 
    ipcRenderer.invoke('db:saveMap', id, title, content, updatedAt),
  deleteMap: (id: string) => ipcRenderer.invoke('db:deleteMap', id),
  
  // Settings APIs (for auto_layout, active_map_id, map_transforms, maps_order)
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
});
