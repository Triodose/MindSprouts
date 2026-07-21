import { StorageProvider } from './storageInterface';
import { localStorageProvider } from './localStorageProvider';
import { sqliteStorageProvider } from './sqliteStorageProvider';

export * from './storageInterface';

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
};

export const storage: StorageProvider = isElectron() ? sqliteStorageProvider : localStorageProvider;
