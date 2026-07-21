import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs from 'sql.js';

let mainWindow: BrowserWindow | null = null;
let db: any = null;
let dbPath: string = '';

// Initialize Database
async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(app.getAppPath(), 'node_modules/sql.js/dist', file)
  });
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  dbPath = path.join(userDataPath, 'local.db');
  console.log('Database path:', dbPath);

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed to load existing database, creating a new one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables if not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS maps (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  saveDatabaseToDisk();
}

function saveDatabaseToDisk() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Failed to save database to disk:', e);
  }
}

// IPC Handlers
function registerIpcHandlers() {
  ipcMain.handle('db:getMaps', async () => {
    try {
      const res = db.exec('SELECT * FROM maps');
      if (res.length === 0) return [];
      const columns = res[0].columns;
      const values = res[0].values;
      return values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        return {
          ...obj,
          content: JSON.parse(obj.content)
        };
      });
    } catch (e) {
      console.error('Failed to get maps:', e);
      return [];
    }
  });

  ipcMain.handle('db:saveMap', async (_, id: string, title: string, content: any, updatedAt: string) => {
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      db.run(
        `INSERT OR REPLACE INTO maps (id, title, content, updated_at) VALUES (?, ?, ?, ?)`,
        [id, title, contentStr, updatedAt]
      );
      saveDatabaseToDisk();
      return { success: true };
    } catch (e) {
      console.error('Failed to save map:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('db:deleteMap', async (_, id: string) => {
    try {
      db.run('DELETE FROM maps WHERE id = ?', [id]);
      saveDatabaseToDisk();
      return { success: true };
    } catch (e) {
      console.error('Failed to delete map:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('db:getSetting', async (_, key: string) => {
    try {
      const res = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
      if (res.length === 0) return null;
      return res[0].values[0][0];
    } catch (e) {
      console.error('Failed to get setting:', e);
      return null;
    }
  });

  ipcMain.handle('db:setSetting', async (_, key: string, value: string) => {
    try {
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
      saveDatabaseToDisk();
      return { success: true };
    } catch (e) {
      console.error('Failed to set setting:', e);
      return { success: false, error: String(e) };
    }
  });
}

const standardChromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

  mainWindow.webContents.setUserAgent(standardChromeUserAgent);

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

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers();
  
  // Set User-Agent for all web contents including Google Login popups
  app.on('web-contents-created', (_, contents) => {
    contents.setUserAgent(standardChromeUserAgent);
  });

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
