import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { MindMapNode, CanvasTransform, MindMapTheme, HistoryState } from '../types/mindmap';
import { DEFAULT_THEME, THEMES } from '../utils/themes';
import * as treeUtils from '../utils/treeUtils';
import { useI18n } from '../context/I18nContext';
import { copyBranch, readBranch, cloneBranch } from '../utils/nodeClipboard';
import { storage } from '../services/storage';


const LOCAL_STORAGE_ACTIVE_ID_KEY = 'mindsprout_active_map_id';

export interface FolderItem {
  id: string;
  name: string;
  isCollapsed?: boolean;
}

export interface MindMapMetadata {
  id: string;
  title: string;
  updated_at: string;
}

const migrateTree = (loadedTree: MindMapNode): MindMapNode => {
  if (loadedTree.id === 'virtual-root') {
    return loadedTree;
  }
  return {
    id: 'virtual-root',
    text: 'Virtual Root',
    children: [
      {
        ...loadedTree,
        offset: loadedTree.offset || { x: 150, y: window.innerHeight / 2 - 40 }
      }
    ]
  };
};

export const useMindMap = () => {
  const { t } = useI18n();
  // MindMaps List Metadata
  const [mapsList, setMapsList] = useState<MindMapMetadata[]>([]);
  const [activeMapId, setActiveMapId] = useState<string>('');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [mapFolderMap, setMapFolderMap] = useState<Record<string, string>>({});

  // Load Folder Settings on startup
  useEffect(() => {
    const loadFolderSettings = async () => {
      const savedFoldersStr = await storage.getSetting('mindsprout_folders', '');
      let parsedFolders: FolderItem[] = [];
      if (savedFoldersStr) {
        try {
          parsedFolders = JSON.parse(savedFoldersStr);
        } catch (e) {
          console.error('Failed to parse folders setting:', e);
        }
      }
      if (!parsedFolders.some(f => f.id === 'default')) {
        parsedFolders = [{ id: 'default', name: t('myMindMaps'), isCollapsed: false }, ...parsedFolders];
      }
      setFolders(parsedFolders);

      const savedMapFoldersStr = await storage.getSetting('mindsprout_map_folders', '{}');
      let parsedMapFolders: Record<string, string> = {};
      if (savedMapFoldersStr) {
        try {
          parsedMapFolders = JSON.parse(savedMapFoldersStr);
        } catch (e) {
          console.error('Failed to parse map_folders setting:', e);
        }
      }
      setMapFolderMap(parsedMapFolders);
    };

    void loadFolderSettings().catch(error => setStorageError(String(error)));
  }, [t]);



  // Current Active Tree State
  const [tree, setTree] = useState<MindMapNode>(() => 
    treeUtils.createInitialTree(
      t('initRoot'),
      t('initChild1'),
      t('initChild1_1'),
      t('initChild1_2'),
      t('initChild2'),
      t('initChild2_1'),
      t('initChild2_2')
    )
  );


  // Auto Layout / Snap alignment mode toggle (persisted to LocalStorage, defaults to true)
  const [isAutoLayout, setIsAutoLayout] = useState<boolean>(true);

  const autoLayoutRef = useRef(isAutoLayout);
  autoLayoutRef.current = isAutoLayout;

  // History for Undo/Redo
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: tree,
    future: []
  });

  // UI Selection & Edit State
  const [selectedId, setSelectedId] = useState<string | null>('root');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Canvas Transform State (Zoom & Pan)
  const [transform, setTransform] = useState<CanvasTransform>({x: 150, y: window.innerHeight / 2 - 40, zoom: 1});

  // Theme resolved dynamically from the root node (tree.themeId)
  const theme = useMemo(() => {
    const activeThemeId = tree.themeId || DEFAULT_THEME.id;
    return THEMES.find((t) => t.id === activeThemeId) || DEFAULT_THEME;
  }, [tree.themeId]);

  const [syncStatus, setSyncStatus] = useState<'saved' | 'dirty' | 'syncing' | 'error'>('saved');
  const [isMapsListLoaded, setIsMapsListLoaded] = useState(false);
  const pendingSave = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveGeneration = useRef(0);
  const savedTree = useRef<MindMapNode | null>(null);
  const [storageError, setStorageError] = useState('');
  const currentTreeRef = useRef(tree);
  currentTreeRef.current = tree;

  // Sessions live only within this workspace. Explicit refresh/remount clears them.
  const mapSessions = useRef(new Map<string, { tree: MindMapNode; history: HistoryState; transform: CanvasTransform; selectedId: string | null }>());
  const loadedMapId = useRef('');
  const viewState = useRef({ tree, history, transform, selectedId });
  viewState.current = { tree, history, transform, selectedId };

  // Active document view state
  const activeMapIdRef = useRef(activeMapId);
  const mapTransformsRef = useRef<Record<string, CanvasTransform>>({});

  // Center Canvas Helper (Centers the bounding box of the ENTIRE mind map)
  const centerCanvas = useCallback(() => {
    const canvasEl = document.querySelector('.canvas-container');
    const nodeElements = document.querySelectorAll('.node-card, .node-summary');

    if (canvasEl && nodeElements.length > 0) {
      const canvasRect = canvasEl.getBoundingClientRect();

      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;

      nodeElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.left < minLeft) minLeft = rect.left;
        if (rect.top < minTop) minTop = rect.top;
        if (rect.right > maxRight) maxRight = rect.right;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      });

      const screenNodesCenterX = (minLeft + maxRight) / 2;
      const screenNodesCenterY = (minTop + maxBottom) / 2;
      const screenCanvasCenterX = canvasRect.left + canvasRect.width / 2;
      const screenCanvasCenterY = canvasRect.top + canvasRect.height / 2;

      setTransform((prev) => {
        const zoom = prev.zoom || 1;
        const dx = (screenCanvasCenterX - screenNodesCenterX) / zoom;
        const dy = (screenCanvasCenterY - screenNodesCenterY) / zoom;

        return {
          x: prev.x + dx,
          y: prev.y + dy,
          zoom: 1
        };
      });
    } else {
      setTransform({
        x: window.innerWidth / 2 - 240,
        y: window.innerHeight / 2 - 20,
        zoom: 1
      });
    }
  }, []);

  const createFolder = useCallback(async (name?: string) => {
    try {
    const finalName = name || t('untitledFolder');
    const newId = 'folder-' + Math.random().toString(36).substring(2, 9);
    const newFolder: FolderItem = { id: newId, name: finalName, isCollapsed: false };
    const updated = [...folders, newFolder];
    await storage.setSetting('mindsprout_folders', JSON.stringify(updated));
    setFolders(updated);
    return newId;
    } catch (error) { setStorageError(String(error)); }
  }, [folders, t]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
    if (!newName.trim()) return;
    const updated = folders.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f);
    await storage.setSetting('mindsprout_folders', JSON.stringify(updated));
    setFolders(updated);
    } catch (error) { setStorageError(String(error)); }
  }, [folders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
    if (folderId === 'default') return;
    const updatedFolders = folders.filter(f => f.id !== folderId);
    await storage.setSetting('mindsprout_folders', JSON.stringify(updatedFolders));
    setFolders(updatedFolders);

    const updatedMapFolder = { ...mapFolderMap };
    Object.keys(updatedMapFolder).forEach(mapId => {
      if (updatedMapFolder[mapId] === folderId) {
        delete updatedMapFolder[mapId];
      }
    });
    await storage.setSetting('mindsprout_map_folders', JSON.stringify(updatedMapFolder));
    setMapFolderMap(updatedMapFolder);
    } catch (error) { setStorageError(String(error)); }
  }, [folders, mapFolderMap]);

  const toggleFolderCollapse = useCallback(async (folderId: string) => {
    try {
    const updated = folders.map(f => f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f);
    await storage.setSetting('mindsprout_folders', JSON.stringify(updated));
    setFolders(updated);
    } catch (error) { setStorageError(String(error)); }
  }, [folders]);

  const moveMapToFolder = useCallback(async (mapId: string, targetFolderId: string) => {
    try {
    const updated = { ...mapFolderMap, [mapId]: targetFolderId };
    await storage.setSetting('mindsprout_map_folders', JSON.stringify(updated));
    setMapFolderMap(updated);
    } catch (error) { setStorageError(String(error)); }
  }, [mapFolderMap]);

  // --- Local Mode Helper ---
  // Seed initial local maps if empty
  const getLocalMaps = useCallback(async (): Promise<any[]> => {
    const maps = await storage.getMaps();
    if (maps && maps.length > 0) {
      return maps;
    }
    return [];
  }, []);

  // --- Custom Sort Order Helper ---
  const applyCustomSort = useCallback(async (items: any[]) => {
    const savedOrder = await storage.getSetting('mindsprout_maps_order', '');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        return [...items].sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          if (idxA === -1 && idxB === -1) {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          }
          if (idxA === -1) return -1; // new item goes to the top
          if (idxB === -1) return 1;  // new item goes to the top
          return idxA - idxB;
        });
      } catch (e) {
        console.error('Failed to parse saved order:', e);
      }
    }
    return [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, []);

  // --- Load / Fetch Maps List ---
  const fetchMapsList = useCallback(async () => {
    try {
      const localMaps = await getLocalMaps();
      setMapsList(await applyCustomSort(localMaps.map(({id, title, updated_at}) => ({id, title, updated_at}))));
      const previous = await storage.getSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, '');
      setActiveMapId(localMaps.find(m => m.id === previous)?.id || localMaps[0]?.id || '');
      setIsMapsListLoaded(true);
    } catch (error) { setStorageError(String(error)); }
  }, [getLocalMaps, applyCustomSort]);
  useEffect(() => { void fetchMapsList(); }, [fetchMapsList]);

  // Load each document once per workspace session; revisits restore its in-memory state.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loadActiveMapContent = async () => {
      if (!activeMapId) { loadedMapId.current = ''; savedTree.current = null; return; }
      const session = mapSessions.current.get(activeMapId);
      if (session) {
        loadedMapId.current = activeMapId;
        savedTree.current = session.tree;
        currentTreeRef.current = session.tree;
        setTree(session.tree); setHistory(session.history); setTransform(session.transform);
        setSelectedId(session.selectedId); setEditingId(null);
        return;
      }
      const localMaps = await getLocalMaps();
      if (cancelled) return;
      const activeMap = localMaps.find(m => m.id === activeMapId);
      if (!activeMap) throw new Error('找不到心智圖，請重新整理工作目錄');
      const migrated = migrateTree(activeMap.content);
      const finalTree = autoLayoutRef.current ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
      loadedMapId.current = activeMapId;
      savedTree.current = finalTree;
      currentTreeRef.current = finalTree;
      setTree(finalTree); setHistory({past: [], present: finalTree, future: []});
      setSelectedId('root'); setEditingId(null);
      for (const delay of [50, 200, 500]) timers.push(setTimeout(() => {
        if (!cancelled && loadedMapId.current === activeMapId) centerCanvas();
      }, delay));
    };
    void loadActiveMapContent().catch(error => { if (!cancelled) setStorageError(String(error)); });
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [activeMapId, centerCanvas, getLocalMaps]);

  // --- Sync / Auto Save Content ---
  const saveMapData = useCallback((currentTree: MindMapNode, _forceImmediate = false): Promise<boolean> => {
    if (!activeMapId) return Promise.resolve(true);
    const generation = ++saveGeneration.current;
    const targetId = activeMapId;
    const title = currentTree.id === 'virtual-root' ? currentTree.children?.[0]?.text || t('untitledMap') : currentTree.text;
    setSyncStatus('syncing');
    const operation = pendingSave.current.then(async () => {
      try {
        const updated = new Date().toISOString();
        await storage.saveMap(targetId, title, currentTree, updated);
        if (generation === saveGeneration.current) {
          savedTree.current = currentTree;
          setSyncStatus('saved'); setStorageError('');
        }
        setMapsList(prev => prev.map(m => m.id === targetId ? { ...m, title, updated_at: updated } : m));
        return true;
      } catch (error) {
        setSyncStatus('error'); setStorageError(String(error));
        return false;
      }
    });
    pendingSave.current = operation;
    return operation;
  }, [activeMapId, t]);

  useEffect(() => {
    window.onbeforeunload = () => syncStatus === 'error' || syncStatus === 'syncing' || (activeMapId && tree !== savedTree.current) ? '' : null;
    return () => { window.onbeforeunload = null; };
  }, [syncStatus, tree, activeMapId]);
  useEffect(() => window.electronAPI?.onCloseRequested(async () => {
    (document.activeElement as HTMLElement | null)?.blur();
    await new Promise(resolve => setTimeout(resolve, 0));
    const success = await saveMapData(currentTreeRef.current, true);
    window.electronAPI!.closeReady(success);
  }), [tree, saveMapData]);
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); void saveMapData(tree, true);
      }
    };
    window.addEventListener('keydown', save);
    return () => window.removeEventListener('keydown', save);
  }, [tree, saveMapData]);

  // Tree modifier with history
  const updateTreeState = useCallback((newTree: MindMapNode) => {
    currentTreeRef.current = newTree;
    setTree(newTree);
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newTree,
      future: []
    }));
    saveMapData(newTree);
  }, [saveMapData]);

  const clipboardContext = useRef({ tree, activeMapId, selectedId });
  clipboardContext.current = { tree, activeMapId, selectedId };
  const [clipboardMessage, setClipboardMessage] = useState('');
  const copySelectedBranch = useCallback(async () => {
    if (!activeMapId || !selectedId || !savedTree.current) return;
    try {
      await window.electronAPI!.copyNodes(copyBranch(tree, selectedId));
      setClipboardMessage(t('branchCopied'));
    } catch { setClipboardMessage(t('branchCopyFailed')); }
  }, [tree, activeMapId, selectedId, t]);
  const pasteSelectedBranch = useCallback(async () => {
    if (!activeMapId || !savedTree.current) return;
    const mapId = activeMapId;
    const parentId = selectedId || tree.children[0]?.id;
    if (!parentId) return;
    try {
      const branch = readBranch(await window.electronAPI!.readNodes());
      if (!branch) { setClipboardMessage(t('branchClipboardEmpty')); return; }
      const current = clipboardContext.current;
      if (current.activeMapId !== mapId || !treeUtils.findNode(current.tree, parentId)) return;
      const cloned = cloneBranch(branch);
      let newTree = treeUtils.addChildNode(current.tree, parentId, cloned.node);
      if (parentId === 'root') newTree = treeUtils.updateNode(newTree, parentId, { isLeftCollapsed: false, isRightCollapsed: false });
      newTree = { ...newTree, relationships: [...(newTree.relationships || []), ...cloned.relationships] };
      clipboardContext.current = { ...current, tree: newTree, selectedId: cloned.node.id };
      updateTreeState(newTree);
      setSelectedId(cloned.node.id); setEditingId(null);
      setClipboardMessage(t('branchPasted'));
    } catch { setClipboardMessage(t('branchPasteFailed')); }
  }, [activeMapId, tree, selectedId, updateTreeState, t]);
  useEffect(() => {
    if (!clipboardMessage) return;
    const timer = setTimeout(() => setClipboardMessage(''), 3500);
    return () => clearTimeout(timer);
  }, [clipboardMessage]);

  // Save transform state
  useEffect(() => {
    // Only update transform for activeMapId if activeMapId has not just switched
    if (activeMapId && activeMapId === activeMapIdRef.current) {
      mapTransformsRef.current[activeMapId] = transform;
      storage.setSetting('mindsprout_map_transforms', JSON.stringify(mapTransformsRef.current));
    }
    activeMapIdRef.current = activeMapId;
  }, [transform, activeMapId]);

  // Theme settings (Mind Map Color Theme, saved in the document)
  const changeTheme = useCallback((newTheme: MindMapTheme) => {
    setTree((latestTree) => {
      const updatedTree = { ...latestTree, themeId: newTheme.id };
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: updatedTree,
        future: []
      }));
      saveMapData(updatedTree);
      return updatedTree;
    });
  }, [saveMapData]);

  // --- Switch Map ---
  const switchMap = useCallback(async (id: string) => {
    if (id === activeMapId) return;
    try {
      if (activeMapId && loadedMapId.current !== activeMapId) return;
      if (activeMapId && (tree !== savedTree.current || syncStatus !== 'saved')) {
        if (!await saveMapData(currentTreeRef.current, true)) return;
      } else if (!await pendingSave.current) return;
      await storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, id);
      if (activeMapId) mapSessions.current.set(activeMapId, { ...viewState.current });
      savedTree.current = null;
      loadedMapId.current = '';
      setActiveMapId(id);
      setSelectedId('root'); setEditingId(null); setConnectingSourceId(null);
    } catch (error) { setStorageError(String(error)); }
  }, [tree, saveMapData, syncStatus, activeMapId]);

  const createNewMap = useCallback(async (title?: string, folderId?: string) => {
    try {
      if (activeMapId && !await saveMapData(tree, true)) return;
      const finalTitle = title || t('untitledMap');
      const content = { ...migrateTree({ id: 'root', text: finalTitle, children: [] }), themeId: 'focus-mint' };
      const id = crypto.randomUUID();
      const updated_at = new Date().toISOString();
      await storage.saveMap(id, finalTitle, content, updated_at);
      if (folderId && folderId !== 'default') {
        const updated = { ...mapFolderMap, [id]: folderId };
        await storage.setSetting('mindsprout_map_folders', JSON.stringify(updated));
        setMapFolderMap(updated);
      }
      setMapsList(prev => [{ id, title: finalTitle, updated_at }, ...prev]);
      await switchMap(id);
    } catch (error) { setStorageError(String(error)); }
  }, [activeMapId, tree, saveMapData, t, mapFolderMap, switchMap]);

  const deleteMap = useCallback(async (id: string) => {
    try {
      if (!await pendingSave.current) return;
      await storage.deleteMap(id);
      mapSessions.current.delete(id);
      const remaining = mapsList.filter(m => m.id !== id);
      setMapsList(remaining);
      if (id === activeMapId) {
        setActiveMapId(remaining[0]?.id || '');
        await storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, remaining[0]?.id || '');
      }
    } catch (error) { setStorageError(String(error)); }
  }, [activeMapId, mapsList]);

  const renameMap = useCallback(async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      if (!await pendingSave.current) return;
      const map = (await getLocalMaps()).find(m => m.id === id);
      if (!map) return;
      const content = migrateTree(id === activeMapId ? tree : mapSessions.current.get(id)?.tree || map.content);
      const renamed = { ...content, children: content.children.map((n: MindMapNode, i: number) => i === 0 ? { ...n, text: newTitle.trim() } : n) };
      const updated = new Date().toISOString();
      await storage.saveMap(id, newTitle.trim(), renamed, updated);
      setMapsList(prev => prev.map(m => m.id === id ? { ...m, title: newTitle.trim(), updated_at: updated } : m));
      const cached = mapSessions.current.get(id);
      if (cached) mapSessions.current.set(id, { ...cached, tree: renamed, history: { past: [], present: renamed, future: [] } });
      if (id === activeMapId) { setTree(renamed); savedTree.current = renamed; setHistory({past: [], present: renamed, future: []}); }
    } catch (error) { setStorageError(String(error)); }
  }, [activeMapId, tree, getLocalMaps]);

  const duplicateMap = useCallback(async (sourceId: string) => {
    try {
      if (activeMapId && !await saveMapData(tree, true)) return;
      const source = (await getLocalMaps()).find(m => m.id === sourceId);
      if (!source) return;
      const title = source.title + '（副本）';
      const content = structuredClone(sourceId === activeMapId ? tree : mapSessions.current.get(sourceId)?.tree || source.content);
      const id = crypto.randomUUID();
      const updated_at = new Date().toISOString();
      await storage.saveMap(id, title, content, updated_at);
      const folder = mapFolderMap[sourceId];
      if (folder) {
        const updated = { ...mapFolderMap, [id]: folder };
        await storage.setSetting('mindsprout_map_folders', JSON.stringify(updated));
        setMapFolderMap(updated);
      }
      setMapsList(prev => [{ id, title, updated_at }, ...prev]);
      await switchMap(id);
    } catch (error) { setStorageError(String(error)); }
  }, [activeMapId, tree, saveMapData, getLocalMaps, mapFolderMap, switchMap]);

  // --- Undo & Redo ---
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      
      setTree(previous);
      saveMapData(previous);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, [saveMapData]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      setTree(next);
      saveMapData(next);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, [saveMapData]);

  // --- Node Operations ---
  const addNodeChild = useCallback((parentId: string) => {
    const newId = treeUtils.generateId();
    const parentDepth = treeUtils.getNodeDepth(tree, parentId);
    const newDepth = parentDepth !== null ? parentDepth + 1 : 1;
    const rootNode = treeUtils.findNode(tree, 'root');
    const levelStyle = rootNode?.levelStyles?.[newDepth];

    const newChild: MindMapNode = {
      id: newId,
      text: t('branchTopic'),
      children: [],
      style: levelStyle ? { ...levelStyle } : undefined
    };

    const newTree = treeUtils.addChildNode(tree, parentId, newChild);
    updateTreeState(newTree);
    setSelectedId(newId);
    setEditingId(newId);
  }, [tree, updateTreeState, t]);

  const addNodeSibling = useCallback((targetId: string) => {
    if (targetId === 'root') {
      addNodeChild(targetId);
      return;
    }

    const newId = treeUtils.generateId();
    const targetDepth = treeUtils.getNodeDepth(tree, targetId);
    const newDepth = targetDepth !== null ? targetDepth : 1;
    const rootNode = treeUtils.findNode(tree, 'root');
    const levelStyle = rootNode?.levelStyles?.[newDepth];

    const newSibling: MindMapNode = {
      id: newId,
      text: t('branchTopic'),
      children: [],
      style: levelStyle ? { ...levelStyle } : undefined
    };

    const { newTree, success } = treeUtils.addSiblingNode(tree, targetId, newSibling);
    if (success) {
      updateTreeState(newTree);
      setSelectedId(newId);
      setEditingId(newId);
    }
  }, [tree, updateTreeState, addNodeChild, t]);

  const deleteNodeSelected = useCallback((targetId: string) => {
    if (targetId === 'root') return;

    const findParentId = (node: MindMapNode, id: string): string | null => {
      if (node.children.some((c) => c.id === id)) return node.id;
      for (const child of node.children) {
        const pId = findParentId(child, id);
        if (pId) return pId;
      }
      return null;
    };

    const parentId = findParentId(tree, targetId);
    const { newTree, deleted } = treeUtils.deleteNode(tree, targetId);
    
    if (deleted) {
      updateTreeState(newTree);
      setSelectedId(parentId || 'root');
      setEditingId(null);
    }
  }, [tree, updateTreeState]);

  const updateNodeText = useCallback((targetId: string, text: string) => {
    const newTree = treeUtils.updateNode(tree, targetId, { text });
    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const updateNodeStyle = useCallback((targetId: string, style: Partial<MindMapNode['style']>) => {
    const node = treeUtils.findNode(tree, targetId);
    if (!node) return;
    const newTree = treeUtils.updateNode(tree, targetId, {
      style: { ...node.style, ...style }
    });
    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const applyStyleToLevel = useCallback((targetId: string, style: Partial<MindMapNode['style']>) => {
    const depth = treeUtils.getNodeDepth(tree, targetId);
    if (depth === null) return;
    
    // 1. Apply style to all existing nodes at this depth
    let newTree = treeUtils.applyStyleToDepth(tree, depth, style);
    
    // 2. Save style for future nodes of this level on the root node
    const rootNode = treeUtils.findNode(newTree, 'root');
    if (rootNode) {
      const currentLevelStyles = rootNode.levelStyles || {};
      const newLevelStyles = {
        ...currentLevelStyles,
        [depth]: {
          ...(currentLevelStyles[depth] || {}),
          ...style
        }
      };
      
      newTree = treeUtils.updateNode(newTree, 'root', {
        levelStyles: newLevelStyles
      });
    }

    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const updateNodeData = useCallback((targetId: string, data: Partial<MindMapNode>) => {
    const node = treeUtils.findNode(tree, targetId);
    if (!node) return;
    const newTree = treeUtils.updateNode(tree, targetId, data);
    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const addSummary = useCallback((startNodeId: string, endNodeId: string) => {
    const parent = treeUtils.findParent(tree, startNodeId);
    if (!parent) return;
    const summaryId = `summary-${treeUtils.generateId()}`;
    const newSummary = {
      id: summaryId,
      startNodeId,
      endNodeId,
      text: t('defaultSummaryText'),
      style: {
        shape: 'rounded',
        borderStyle: 'solid'
      },
      children: []
    } as any;
    const newTree = treeUtils.addSummary(tree, parent.id, newSummary);
    updateTreeState(newTree);
    setSelectedId(summaryId);
  }, [tree, updateTreeState, t]);

  const updateSummaryRange = useCallback((summaryId: string, startNodeId: string, endNodeId: string) => {
    const newTree = treeUtils.updateSummaryRange(tree, summaryId, startNodeId, endNodeId);
    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const deleteSummary = useCallback((summaryId: string) => {
    const newTree = treeUtils.deleteSummary(tree, summaryId);
    updateTreeState(newTree);
    if (selectedId === summaryId) {
      setSelectedId('root');
    }
  }, [tree, selectedId, updateTreeState]);

  const toggleCollapse = useCallback((targetId: string, side?: 'left' | 'right') => {
    const node = treeUtils.findNode(tree, targetId);
    if (!node) return;
    
    let update: Partial<MindMapNode> = {};
    if (targetId === 'root' && side) {
      if (side === 'left') {
        update = { isLeftCollapsed: !node.isLeftCollapsed };
      } else {
        update = { isRightCollapsed: !node.isRightCollapsed };
      }
    } else {
      update = { isCollapsed: !node.isCollapsed };
    }

    const newTree = treeUtils.updateNode(tree, targetId, update);
    updateTreeState(newTree);
  }, [tree, updateTreeState]);

  const importTree = useCallback(async (newTree: MindMapNode) => {
    try {
      if (activeMapId && !await saveMapData(tree, true)) return;
      const migrated = migrateTree({ ...newTree, id: newTree.id || 'root' });
      const title = migrated.children?.[0]?.text || t('importedMap');
      const id = crypto.randomUUID();
      const updated_at = new Date().toISOString();
      await storage.saveMap(id, title, migrated, updated_at);
      setMapsList(prev => [{ id, title, updated_at }, ...prev]);
      await switchMap(id);
    } catch (error) { setStorageError(String(error)); }
  }, [activeMapId, tree, saveMapData, t, switchMap]);

  // --- Drag Operations ---
  const updateNodeOffsetSilent = useCallback((targetId: string, offset: { x: number; y: number } | undefined) => {
    setTree((prevTree) => treeUtils.updateNode(prevTree, targetId, { offset }));
  }, []);

  const commitTreeState = useCallback((targetId?: string, finalOffset?: { x: number; y: number } | undefined) => {
    if (targetId === 'root') {
      const rootNodeInHistory = treeUtils.findNode(history.present, 'root');
      const originalOffset = rootNodeInHistory?.offset || { x: 150, y: window.innerHeight / 2 - 40 };
      
      if (finalOffset) {
        const dx = finalOffset.x - originalOffset.x;
        const dy = finalOffset.y - originalOffset.y;

        setTransform((prev) => ({
          ...prev,
          x: prev.x + dx * prev.zoom,
          y: prev.y + dy * prev.zoom
        }));
      }

      setTree((prevTree) => treeUtils.updateNode(prevTree, 'root', { offset: originalOffset }));
      return;
    }

    setTree((latestTree) => {
      let updatedTree = latestTree;
      if (targetId) {
        updatedTree = treeUtils.updateNode(latestTree, targetId, { offset: finalOffset });
      }
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: updatedTree,
        future: []
      }));
      saveMapData(updatedTree);
      return updatedTree;
    });
  }, [saveMapData, history.present, setTransform]);

  const createFloatingNode = useCallback((x: number, y: number) => {
    const newId = treeUtils.generateId();
    setTree((latestTree) => {
      const newNode: MindMapNode = {
        id: newId,
        text: t('floatingTopic'),
        offset: { x, y },
        children: []
      };
      const newTree = treeUtils.addChildNode(latestTree, 'virtual-root', newNode);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
    setSelectedId(newId);
    setEditingId(newId);
  }, [saveMapData, t]);

  const reparentNode = useCallback((nodeId: string, newParentId: string) => {
    setTree((latestTree) => {
      const getParentId = (node: MindMapNode, id: string): string | null => {
        if (node.children.some((c) => c.id === id)) return node.id;
        for (const child of node.children) {
          const pId = getParentId(child, id);
          if (pId) return pId;
        }
        return null;
      };

      const currentParentId = getParentId(latestTree, nodeId);
      if (
        nodeId === newParentId ||
        treeUtils.isDescendant(latestTree, nodeId, newParentId) ||
        currentParentId === newParentId
      ) {
        return latestTree;
      }

      const newTree = treeUtils.reparentNode(latestTree, nodeId, newParentId);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
    setSelectedId(nodeId);
  }, [saveMapData]);

  const reorderNode = useCallback((nodeId: string, targetId: string, position: 'before' | 'after') => {
    setTree((latestTree) => {
      // Cannot reorder relative to itself or descendant
      if (nodeId === targetId || treeUtils.isDescendant(latestTree, nodeId, targetId)) {
        return latestTree;
      }

      const newTree = treeUtils.reorderNode(latestTree, nodeId, targetId, position);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
    setSelectedId(nodeId);
  }, [saveMapData]);

  const indentNodeSelected = useCallback((nodeId: string) => {
    setTree((latestTree) => {
      const newTree = treeUtils.indentNode(latestTree, nodeId);
      if (newTree === latestTree) return latestTree;
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
  }, [saveMapData]);

  const outdentNodeSelected = useCallback((nodeId: string) => {
    setTree((latestTree) => {
      const newTree = treeUtils.outdentNode(latestTree, nodeId);
      if (newTree === latestTree) return latestTree;
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
  }, [saveMapData]);

  const startConnection = useCallback((nodeId: string) => {
    setConnectingSourceId(nodeId);
  }, []);

  const completeConnection = useCallback((targetId: string) => {
    if (!connectingSourceId || connectingSourceId === targetId) {
      setConnectingSourceId(null);
      return;
    }
    setTree((latestTree) => {
      const newTree = treeUtils.addRelationship(latestTree, connectingSourceId, targetId);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
    setConnectingSourceId(null);
  }, [connectingSourceId, saveMapData]);

  const cancelConnection = useCallback(() => {
    setConnectingSourceId(null);
  }, []);

  const deleteRelationshipSelected = useCallback((relId: string) => {
    setTree((latestTree) => {
      const newTree = treeUtils.deleteRelationship(latestTree, relId);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
  }, [saveMapData]);

  const updateRelationshipLabel = useCallback((relId: string, text: string) => {
    setTree((latestTree) => {
      const newTree = treeUtils.updateRelationshipText(latestTree, relId, text);
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newTree,
        future: []
      }));
      saveMapData(newTree);
      return newTree;
    });
  }, [saveMapData]);

  const toggleAutoLayout = useCallback((active: boolean) => {
    setIsAutoLayout(active);
    storage.setSetting('mindsprout_auto_layout', String(active));
    if (active) {
      setTree((prevTree) => {
        const sorted = treeUtils.sortTreeByVisualY(prevTree);
        const cleaned = treeUtils.clearSubNodeOffsets(sorted);
        setHistory((prev) => ({
          past: [...prev.past, prev.present],
          present: cleaned,
          future: []
        }));
        saveMapData(cleaned);
        return cleaned;
      });
    }
  }, [saveMapData]);

  const reorderMapsList = useCallback((startIndex: number, endIndex: number) => {
    setMapsList(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      const orderIds = result.map(m => m.id);
      storage.setSetting('mindsprout_maps_order', JSON.stringify(orderIds));
      
      return result;
    });
  }, []);

  return {
    tree,
    selectedId,
    editingId,
    transform,
    theme,
    history,
    mapsList,
    activeMapId,
    setSelectedId,
    setEditingId,
    setTransform,
    changeTheme,
    undo,
    redo,
    addNodeChild,
    addNodeSibling,
    deleteNodeSelected,
    updateNodeText,
    updateNodeStyle,
    applyStyleToLevel,
    updateNodeData,
    toggleCollapse,
    importTree,
    centerCanvas,
    switchMap,
    createNewMap,
    duplicateMap,
    deleteMap,
    renameMap,
    updateNodeOffsetSilent,
    commitTreeState,
    createFloatingNode,
    reparentNode,
    reorderNode,
    indentNodeSelected,
    outdentNodeSelected,
    isAutoLayout,
    toggleAutoLayout,
    connectingSourceId,
    startConnection,
    completeConnection,
    cancelConnection,
    deleteRelationshipSelected,
    updateRelationshipLabel,
    addSummary,
    updateSummaryRange,
    deleteSummary,
    reorderMapsList,
    saveMapData,
    syncStatus,
    isMapsListLoaded,
    folders,
    mapFolderMap,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderCollapse,
    moveMapToFolder,
    storageError,
    copySelectedBranch,
    pasteSelectedBranch,
    clipboardMessage,
    hasActiveMap: !!activeMapId && savedTree.current !== null,
  };
};
