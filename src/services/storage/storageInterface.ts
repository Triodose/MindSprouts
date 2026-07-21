export interface MindMap {
  id: string;
  title: string;
  content: any;
  updated_at: string;
}

export interface StorageProvider {
  getMaps(): Promise<MindMap[]>;
  saveMap(id: string, title: string, content: any, updatedAt: string): Promise<void>;
  deleteMap(id: string): Promise<void>;
  getSetting(key: string, defaultValue: string): Promise<string>;
  setSetting(key: string, value: string): Promise<void>;
}
