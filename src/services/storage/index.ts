import type { StorageProvider } from './storageInterface';
import { workspaceStorageProvider } from './workspaceStorageProvider';

export * from './storageInterface';

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
};

export const storage: StorageProvider = workspaceStorageProvider;
