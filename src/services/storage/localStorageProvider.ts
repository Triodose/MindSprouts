import { StorageProvider, MindMap } from './storageInterface';

export const localStorageProvider: StorageProvider = {
  getMaps: async (): Promise<MindMap[]> => {
    const saved = localStorage.getItem('mindsprout_maps_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage maps:', e);
      }
    }
    return [];
  },

  saveMap: async (id: string, title: string, content: any, updatedAt: string): Promise<void> => {
    const maps = await localStorageProvider.getMaps();
    const existingIndex = maps.findIndex((m) => m.id === id);
    const newMapItem: MindMap = { id, title, content, updated_at: updatedAt };
    
    if (existingIndex !== -1) {
      maps[existingIndex] = newMapItem;
    } else {
      maps.push(newMapItem);
    }
    localStorage.setItem('mindsprout_maps_list', JSON.stringify(maps));
  },

  deleteMap: async (id: string): Promise<void> => {
    const maps = await localStorageProvider.getMaps();
    const filtered = maps.filter((m) => m.id !== id);
    localStorage.setItem('mindsprout_maps_list', JSON.stringify(filtered));
  },

  getSetting: async (key: string, defaultValue: string): Promise<string> => {
    const val = localStorage.getItem(key);
    return val !== null ? val : defaultValue;
  },

  setSetting: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  }
};
