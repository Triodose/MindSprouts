import { app, BrowserWindow, ipcMain, Menu, dialog, shell, clipboard } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Workspace, atomicWrite, safeName } from './workspace';
import { randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';

let mainWindow: BrowserWindow | null = null;
let workspace: Workspace | null = null;
let preferencesPath = '';
let closeReady = false;
let rendererReady = false;
let startupError = '';
function requireWorkspace() {
  if (!workspace) throw new Error('請先選擇工作目錄');
  return workspace;
}
function registerIpcHandlers() {
  ipcMain.handle('nodes:copy', (_, text: string) => { clipboard.writeText(text); });
  ipcMain.handle('nodes:paste', () => clipboard.readText());
  ipcMain.on('workspace:rendererReady', (_, ready) => { rendererReady = ready; });
  ipcMain.on('workspace:closeReady', async (_, success) => {
    if (!success) {
      const answer = await dialog.showMessageBox(mainWindow!, { type: 'warning', message: '儲存失敗，是否放棄未儲存的變更並關閉？', buttons: ['返回編輯', '放棄並關閉'], defaultId: 0, cancelId: 0 });
      if (answer.response !== 1) return;
    }
    closeReady = true; mainWindow?.close();
  });
  ipcMain.handle('workspace:info', () => ({ directory: workspace?.directory || null, warnings: workspace?.warnings || (startupError ? [startupError] : []) }));
  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null;
    const candidate = new Workspace(result.filePaths[0]);
    atomicWrite(preferencesPath, JSON.stringify({ directory: candidate.directory }));
    workspace = candidate;
    return { directory: candidate.directory, warnings: candidate.warnings };
  });
  ipcMain.handle('workspace:saveCopy', async (_, title: string, content: any) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '另存心智圖副本', defaultPath: path.join(requireWorkspace().directory, safeName(title) + ' (副本).sprout'),
      filters: [{ name: 'MindSprouts', extensions: ['sprout'] }]
    });
    if (result.canceled || !result.filePath) return false;
    atomicWrite(result.filePath, JSON.stringify({ version: 1, id: randomUUID(), title, content, updated_at: new Date().toISOString() }, null, 2));
    return true;
  });
  ipcMain.handle('workspace:open', () => shell.openPath(requireWorkspace().directory));
  ipcMain.handle('workspace:refresh', () => { requireWorkspace().readMaps(); return { warnings: workspace!.warnings }; });
  ipcMain.handle('workspace:migrate', async () => {
    const target = requireWorkspace();
    const oldFile = path.join(app.getPath('userData'), 'local.db');
    if (!fs.existsSync(oldFile)) return { imported: 0, errors: ['找不到舊版 local.db'] };
    const SQL = await initSqlJs({ locateFile: file => path.join(app.getAppPath(), 'node_modules/sql.js/dist', file) });
    const db = new SQL.Database(fs.readFileSync(oldFile));
    const errors: string[] = [];
    let imported = 0;
    try {
      const rows = db.exec('SELECT id, title, content, updated_at FROM maps')[0]?.values || [];
      const existing = new Set(target.getMaps().map(m => m.id));
      const legacySettings: Record<string, string> = {};
      for (const row of db.exec('SELECT key, value FROM settings')[0]?.values || []) legacySettings[String(row[0])] = String(row[1]);
      const currentFolders = JSON.parse(target.settings.mindsprout_folders || '[]');
      const folderIds: Record<string, string> = {};
      for (const folder of JSON.parse(legacySettings.mindsprout_folders || '[]')) {
        if (folder.id === 'default') continue;
        const id = currentFolders.some((f: any) => f.id === folder.id) ? randomUUID() : folder.id;
        folderIds[folder.id] = id;
        currentFolders.push({ id, name: folder.name, isCollapsed: folder.isCollapsed });
      }
      target.setSetting('mindsprout_folders', JSON.stringify(currentFolders));
      const assignments = JSON.parse(target.settings.mindsprout_map_folders || '{}');
      const oldAssignments = JSON.parse(legacySettings.mindsprout_map_folders || '{}');
      for (const row of rows) {
        try {
          const id = existing.has(String(row[0])) ? randomUUID() : String(row[0]);
          target.save({ id, title: String(row[1]), content: JSON.parse(String(row[2])), updated_at: String(row[3]) });
          if (folderIds[oldAssignments[String(row[0])]]) {
            assignments[id] = folderIds[oldAssignments[String(row[0])]];
            target.setSetting('mindsprout_map_folders', JSON.stringify(assignments));
          }
          const loaded = new Workspace(target.directory).getMaps().find(m => m.id === id);
          if (!loaded || JSON.stringify(loaded.content) !== JSON.stringify(JSON.parse(String(row[2])))) throw new Error('讀回驗證失敗');
          existing.add(id); imported++;
        } catch (error) { errors.push(`${row[1]}：${String(error)}`); }
      }
    } finally { db.close(); }
    return { imported, errors };
  });
  ipcMain.handle('db:getMaps', () => requireWorkspace().getMaps());
  ipcMain.handle('db:saveMap', (_, id, title, content, updated_at) => {
    try { requireWorkspace().save({ id, title, content, updated_at }); return { success: true }; }
    catch (error) { return { success: false, error: String(error) }; }
  });
  ipcMain.handle('db:deleteMap', async (_, id) => {
    try { await requireWorkspace().remove(id, file => shell.trashItem(file)); return { success: true }; }
    catch (error) { return { success: false, error: String(error) }; }
  });
  ipcMain.handle('db:getSetting', (_, key) => requireWorkspace().settings[key] ?? null);
  ipcMain.handle('db:setSetting', (_, key, value) => {
    try { requireWorkspace().setSetting(key, value); return { success: true }; }
    catch (error) { return { success: false, error: String(error) }; }
  });
}

async function createWindow() {
  closeReady = false;
  Menu.setApplicationMenu(null);
  const iconPath = path.join(app.getAppPath(), 'build/icon-v3.png');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize(); // Maximize window on startup


  // Check if we are running in development mode
  const isDev = !app.isPackaged;
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5189');
  } else {
    const distPath = path.join(__dirname, '../renderer');
    await mainWindow.loadFile(path.join(distPath, 'index.html'));
  }

  mainWindow.on('close', event => {
    if (!closeReady && rendererReady) { event.preventDefault(); mainWindow!.webContents.send('workspace:requestClose'); }
  });
  mainWindow.webContents.on('will-prevent-unload', event => { if (closeReady) event.preventDefault(); });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  preferencesPath = path.join(app.getPath('userData'), 'workspace.json');
  try {
    if (fs.existsSync(preferencesPath)) workspace = new Workspace(JSON.parse(fs.readFileSync(preferencesPath, 'utf8')).directory);
  } catch (error) { startupError = '上次使用的工作目錄無法開啟：' + String(error); console.error(startupError); }
  registerIpcHandlers();
  
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
