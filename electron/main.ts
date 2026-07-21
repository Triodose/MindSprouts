import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let db: any = null;

// Initialize Database
function initDatabase() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, 'local.db');
  console.log('Database path:', dbPath);

  db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS maps (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updated_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

// IPC Handlers
function registerIpcHandlers() {
  ipcMain.handle('db:getMaps', async () => {
    try {
      const rows = db.prepare('SELECT * FROM maps').all();
      return rows.map((row: any) => ({
        ...row,
        content: JSON.parse(row.content)
      }));
    } catch (e) {
      console.error('Failed to get maps:', e);
      return [];
    }
  });

  ipcMain.handle('db:saveMap', async (_, id: string, title: string, content: any, updatedAt: string) => {
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const stmt = db.prepare(`
        INSERT INTO maps (id, title, content, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          updated_at = excluded.updated_at
      `);
      stmt.run(id, title, contentStr, updatedAt);
      return { success: true };
    } catch (e) {
      console.error('Failed to save map:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('db:deleteMap', async (_, id: string) => {
    try {
      db.prepare('DELETE FROM maps WHERE id = ?').run(id);
      return { success: true };
    } catch (e) {
      console.error('Failed to delete map:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('db:getSetting', async (_, key: string) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
      return row ? row.value : null;
    } catch (e) {
      console.error('Failed to get setting:', e);
      return null;
    }
  });

  ipcMain.handle('db:setSetting', async (_, key: string, value: string) => {
    try {
      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value
      `).run(key, value);
      return { success: true };
    } catch (e) {
      console.error('Failed to set setting:', e);
      return { success: false, error: String(e) };
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Check if we are running in development mode
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
