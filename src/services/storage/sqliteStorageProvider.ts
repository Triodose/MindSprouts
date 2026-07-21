import type { StorageProvider, MindMap } from './storageInterface';

declare global {
  interface Window {
    electronAPI?: {
      getMaps(): Promise<MindMap[]>;
      saveMap(id: string, title: string, content: any, updatedAt: string): Promise<{ success: boolean; error?: string }>;
      deleteMap(id: string): Promise<{ success: boolean; error?: string }>;
      getSetting(key: string): Promise<string | null>;
      setSetting(key: string, value: string): Promise<{ success: boolean; error?: string }>;
    };
  }
}

export const sqliteStorageProvider: StorageProvider = {
  getMaps: async (): Promise<MindMap[]> => {
    if (window.electronAPI) {
      return window.electronAPI.getMaps();
    }
    return [];
  },

  saveMap: async (id: string, title: string, content: any, updatedAt: string): Promise<void> => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveMap(id, title, content, updatedAt);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save map via SQLite');
      }
    }
  },

  deleteMap: async (id: string): Promise<void> => {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteMap(id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete map via SQLite');
      }
    }
  },

  getSetting: async (key: string, defaultValue: string): Promise<string> => {
    if (window.electronAPI) {
      const val = await window.electronAPI.getSetting(key);
      return val !== null ? val : defaultValue;
    }
    return defaultValue;
  },

  setSetting: async (key: string, value: string): Promise<void> => {
    if (window.electronAPI) {
      const res = await window.electronAPI.setSetting(key, value);
      if (!res.success) {
        throw new Error(res.error || 'Failed to set setting via SQLite');
      }
    }
  }
};
