import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { MindMapNode, CanvasTransform, MindMapTheme, HistoryState } from '../types/mindmap';
import { DEFAULT_THEME, THEMES } from '../utils/themes';
import * as treeUtils from '../utils/treeUtils';
import * as googleDriveClient from '../utils/googleDriveClient';
import { useI18n } from '../context/I18nContext';
import { storage } from '../services/storage';

declare const google: any;

const LOCAL_STORAGE_MAPS_KEY = 'mindsprout_local_maps';
const LOCAL_STORAGE_ACTIVE_ID_KEY = 'mindsprout_active_map_id';

export interface MindMapMetadata {
  id: string;
  title: string;
  updated_at: string;
}

export interface GoogleUserInfo {
  name: string;
  email: string;
  avatar_url: string;
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

const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

export const useMindMap = () => {
  const { t } = useI18n();
  // MindMaps List Metadata
  const [mapsList, setMapsList] = useState<MindMapMetadata[]>([]);
  const [activeMapId, setActiveMapId] = useState<string>('default-map');

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

  // Outliner Mode Toggle
  const [isOutlinerMode, setIsOutlinerMode] = useState<boolean>(false);

  // Auto Layout / Snap alignment mode toggle (persisted to LocalStorage, defaults to true)
  const [isAutoLayout, setIsAutoLayout] = useState<boolean>(true);

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
  const [transform, setTransform] = useState<CanvasTransform>(() => {
    const activeId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY) || 'default-map';
    const savedTransforms = localStorage.getItem('mindsprout_map_transforms');
    if (savedTransforms) {
      try {
        const transforms = JSON.parse(savedTransforms);
        if (transforms[activeId]) {
          return transforms[activeId];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { x: 150, y: window.innerHeight / 2 - 40, zoom: 1 };
  });

  // Theme resolved dynamically from the root node (tree.themeId)
  const theme = useMemo(() => {
    const activeThemeId = tree.themeId || DEFAULT_THEME.id;
    return THEMES.find((t) => t.id === activeThemeId) || DEFAULT_THEME;
  }, [tree.themeId]);

  // Google Drive & Identity Auth States
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleTokenExpiry, setGoogleTokenExpiry] = useState<number>(0);
  const [googleUserInfo, setGoogleUserInfo] = useState<GoogleUserInfo | null>(() => {
    const cached = localStorage.getItem('google_user_info');
    return cached ? JSON.parse(cached) : null;
  });
  const [googleFolderId, setGoogleFolderId] = useState<string | null>(() => {
    return localStorage.getItem('google_folder_id');
  });
  const [syncStatus, setSyncStatus] = useState<'saved' | 'dirty' | 'syncing' | 'error'>('saved');
  const [isMapsListLoaded, setIsMapsListLoaded] = useState<boolean>(false);
  const isSyncing = syncStatus === 'syncing';
  const setIsSyncing = useCallback((syncing: boolean) => {
    setSyncStatus(syncing ? 'syncing' : 'saved');
  }, []);

  // Mock a user object to match previous Supabase user signature
  const user = useMemo(() => {
    return googleUserInfo 
      ? { email: googleUserInfo.email, user_metadata: { avatar_url: googleUserInfo.avatar_url } }
      : null;
  }, [googleUserInfo]);

  // Client configuration and reference
  const tokenClientRef = useRef<any>(null);

  // Sync state reference to avoid stale updates
  const saveTimeoutRef = useRef<any | null>(null);
  const activeMapIdRef = useRef(activeMapId);
  const mapTransformsRef = useRef<Record<string, CanvasTransform>>({});

  // Center Canvas Helper
  const centerCanvas = useCallback(() => {
    const rootEl = document.querySelector('[data-node-id="root"]');
    const containerEl = document.querySelector('.tree-container');
    const canvasEl = document.querySelector('.canvas-container');

    if (rootEl && containerEl && canvasEl) {
      const rootRect = rootEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const canvasRect = canvasEl.getBoundingClientRect();

      setTransform((prev) => {
        // Calculate the zoom-independent coordinates of the root card relative to the tree-container origin
        const unzoomedCardLeft = (rootRect.left - containerRect.left) / prev.zoom;
        const unzoomedCardTop = (rootRect.top - containerRect.top) / prev.zoom;
        const cardWidth = rootEl.clientWidth;
        const cardHeight = rootEl.clientHeight;

        const canvasCardCenterX = unzoomedCardLeft + cardWidth / 2;
        const canvasCardCenterY = unzoomedCardTop + cardHeight / 2;

        return {
          x: canvasRect.width / 2 - canvasCardCenterX,
          y: canvasRect.height / 2 - canvasCardCenterY,
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

  const handleSuccessfulLogin = useCallback(async (token: string) => {
    setIsMapsListLoaded(false);
    setIsSyncing(true);
    try {
      // 1. Fetch Google user info
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!userRes.ok) throw new Error('Failed to fetch Google user info');
      const gUser = await userRes.json();
      
      const userInfo = {
        name: gUser.name,
        email: gUser.email,
        avatar_url: gUser.picture
      };
      setGoogleUserInfo(userInfo);
      localStorage.setItem('google_user_info', JSON.stringify(userInfo));

      // 2. Get or create app folder on Drive
      const folderId = await googleDriveClient.getOrCreateAppFolder(token);
      setGoogleFolderId(folderId);
      localStorage.setItem('google_folder_id', folderId);
    } catch (err) {
      console.error('Failed to setup Google Drive session:', err);
      // Logout on error to reset state
      logoutGoogle();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const logoutGoogle = useCallback(() => {
    setGoogleAccessToken(null);
    setGoogleTokenExpiry(0);
    setGoogleUserInfo(null);
    setGoogleFolderId(null);
    setIsMapsListLoaded(false);
    
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_folder_id');
    localStorage.removeItem('google_user_info');
    localStorage.removeItem('google_drive_connected');
    
    setActiveMapId('default-map');
    storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, 'default-map');
  }, []);

  // --- Auth Handling & Client Init ---
  useEffect(() => {
    const initGoogleClient = () => {
      if (typeof google === 'undefined') {
        setTimeout(initGoogleClient, 100);
        return;
      }

      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google authorization error:', response);
            return;
          }
          const token = response.access_token;
          const expiresAt = Date.now() + (response.expires_in || 3600) * 1000 - 60000;
          
          setGoogleAccessToken(token);
          setGoogleTokenExpiry(expiresAt);
          localStorage.setItem('google_access_token', token);
          localStorage.setItem('google_token_expiry', expiresAt.toString());
          localStorage.setItem('google_drive_connected', 'true');
          
          await handleSuccessfulLogin(token);
        }
      });
      
      // Silent refresh / restore connection on reload
      const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');
      const cachedToken = localStorage.getItem('google_access_token');
      const cachedExpiry = localStorage.getItem('google_token_expiry');
      
      if (isConnected) {
        if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
          setGoogleAccessToken(cachedToken);
          setGoogleTokenExpiry(parseInt(cachedExpiry));
          handleSuccessfulLogin(cachedToken);
        } else {
          // Silent token request
          tokenClientRef.current?.requestAccessToken({ prompt: '' });
        }
      }
    };

    initGoogleClient();
  }, [handleSuccessfulLogin]);

  const getValidToken = useCallback(async (): Promise<string> => {
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');
    if (!isConnected) throw new Error('Google Drive is not connected');

    const token = googleAccessToken || localStorage.getItem('google_access_token');
    const expiry = googleTokenExpiry || parseInt(localStorage.getItem('google_token_expiry') || '0');

    if (token && expiry && Date.now() < expiry) {
      return token;
    }

    return new Promise((resolve, reject) => {
      if (!tokenClientRef.current) {
        reject(new Error('Google Identity Services client not initialized'));
        return;
      }

      const originalCallback = tokenClientRef.current.callback;
      tokenClientRef.current.callback = async (response: any) => {
        tokenClientRef.current.callback = originalCallback;

        if (response.error) {
          reject(new Error(`Google silent auth failed: ${response.error}`));
          return;
        }

        const token = response.access_token;
        const expiresAt = Date.now() + (response.expires_in || 3600) * 1000 - 60000;

        setGoogleAccessToken(token);
        setGoogleTokenExpiry(expiresAt);
        localStorage.setItem('google_access_token', token);
        localStorage.setItem('google_token_expiry', expiresAt.toString());

        await handleSuccessfulLogin(token);
        resolve(token);
      };

      tokenClientRef.current.requestAccessToken({ prompt: '' });
    });
  }, [handleSuccessfulLogin, googleAccessToken, googleTokenExpiry]);

  // --- Local Mode Helper ---
  // Seed initial local maps if empty
  const getLocalMaps = useCallback(async (): Promise<any[]> => {
    const maps = await storage.getMaps();
    if (maps && maps.length > 0) {
      return maps;
    }
    const initialTree = treeUtils.createInitialTree();
    const defaultMap = {
      id: 'default-map',
      title: initialTree.text,
      content: initialTree,
      updated_at: new Date().toISOString()
    };
    await storage.saveMap(defaultMap.id, defaultMap.title, defaultMap.content, defaultMap.updated_at);
    return [defaultMap];
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
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');
    if (isConnected) {
      if (!googleAccessToken) {
        // Connected but waiting for Google access token (e.g. initial load / silent refresh)
        // Load the local cache first so user does not see a blank sidebar
        const localMaps = await getLocalMaps();
        const list = localMaps.map((m) => ({
          id: m.id,
          title: m.title,
          updated_at: m.updated_at
        }));
        setMapsList(await applyCustomSort(list));
        setIsMapsListLoaded(true);
        return;
      }
      setIsSyncing(true);
      try {
        const token = await getValidToken();
        const folderId = localStorage.getItem('google_folder_id') || googleFolderId;
        if (!folderId) {
          // Folder is still being initialized in handleSuccessfulLogin, skip listing files for now
          return;
        }

        // 1. Fetch current maps from Google Drive
        const driveFiles = await googleDriveClient.listSproutFiles(token, folderId);
        
        // Map Google Drive files into MindMapMetadata array
        let driveMetadata: MindMapMetadata[] = driveFiles.map(f => {
          const title = f.name.endsWith('.sprout') ? f.name.slice(0, -7) : f.name;
          return {
            id: f.id,
            title,
            updated_at: f.modifiedTime || f.createdTime || new Date().toISOString()
          };
        });

        // 2. Check if we have local maps that need to be migrated
        const localMaps = await getLocalMaps();
        const unmigratedMaps = localMaps.filter(lm => {
          return lm.id === 'default-map' || !driveMetadata.some(dm => dm.id === lm.id);
        });

        if (unmigratedMaps.length > 0) {
          console.log(`Found ${unmigratedMaps.length} unmigrated local maps. Uploading to Google Drive...`);
          const migratedLocalMaps = [...localMaps];

          for (const localMap of unmigratedMaps) {
            try {
              // Create sprout file on Google Drive
              const newFileId = await googleDriveClient.createSproutFile(token, folderId, localMap.title, {
                id: localMap.id,
                title: localMap.title,
                content: localMap.content
              });

              // Find index of this local map and update its ID in local storage to the Google Drive file ID
              const idx = migratedLocalMaps.findIndex(m => m.id === localMap.id);
              if (idx !== -1) {
                migratedLocalMaps[idx] = {
                  ...migratedLocalMaps[idx],
                  id: newFileId,
                  updated_at: new Date().toISOString()
                };
              }
              
              // If the migrated map was the currently active map, update the active map ID
              if (activeMapId === localMap.id) {
                setActiveMapId(newFileId);
                storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, newFileId);
              }

              driveMetadata.push({
                id: newFileId,
                title: localMap.title,
                updated_at: new Date().toISOString()
              });
            } catch (migrationErr) {
              console.error('Failed to migrate local map to Google Drive:', localMap.title, migrationErr);
            }
          }

          // Save the updated IDs back to LocalStorage
          localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(migratedLocalMaps));
          // Sort by custom order or updated_at descending
          driveMetadata = await applyCustomSort(driveMetadata);
        }

        // 3. Update the state with the combined/migrated list
        if (driveMetadata.length > 0) {
          setMapsList(await applyCustomSort(driveMetadata));
          if (!driveMetadata.some((m) => m.id === activeMapId)) {
            setActiveMapId(driveMetadata[0].id);
            storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, driveMetadata[0].id);
          }
        } else {
          // If Drive is empty (highly unlikely now), fallback to create default
          const initial = treeUtils.createInitialTree(
            t('initRoot'),
            t('initChild1'),
            t('initChild1_1'),
            t('initChild1_2'),
            t('initChild2'),
            t('initChild2_1'),
            t('initChild2_2')
          );
          const fileId = await googleDriveClient.createSproutFile(token, folderId, initial.text, {
            id: '',
            title: initial.text,
            content: initial
          });
          
          setMapsList([{ id: fileId, title: initial.text, updated_at: new Date().toISOString() }]);
          setActiveMapId(fileId);
          storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, fileId);
        }
        setIsMapsListLoaded(true);
      } catch (err) {
        console.error('Failed to fetch maps from Google Drive:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local mode
      const localMaps = await getLocalMaps();
      const list = localMaps.map((m) => ({
        id: m.id,
        title: m.title,
        updated_at: m.updated_at
      }));
      setMapsList(await applyCustomSort(list));
      setIsMapsListLoaded(true);
      
      // Keep active id consistent
      if (!list.some((m) => m.id === activeMapId) && list.length > 0) {
        setActiveMapId(list[0].id);
        storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, list[0].id);
      }
    }
  }, [user, activeMapId, getLocalMaps, applyCustomSort, getValidToken, googleFolderId, googleAccessToken]);

  // Trigger fetch when user status changes, active ID switches, or folder ID becomes available
  useEffect(() => {
    fetchMapsList();
  }, [user, googleFolderId, googleAccessToken]);

  // --- Load Selected Map Content ---
  useEffect(() => {
    const loadActiveMapContent = async () => {
      const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');
      if (isConnected) {
        if (!isMapsListLoaded) return;

        // Prevent loading map content if activeMapId is not a valid Google Drive file ID
        // (Wait for fetchMapsList to migrate local maps or correct the active ID)
        const isValidId = mapsList.some(m => m.id === activeMapId);
        if (!isValidId) return;

        setIsSyncing(true);
        try {
          const token = await getValidToken();
          const data = await googleDriveClient.downloadSproutFile(token, activeMapId);
          if (data && data.content) {
            const parsed = data.content as MindMapNode;
            const migrated = migrateTree(parsed);
            const finalTree = isAutoLayout ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
            setTree(finalTree);
            setHistory({ past: [], present: finalTree, future: [] });

            // Restore map-specific transform
            if (mapTransformsRef.current[activeMapId]) {
              setTransform(mapTransformsRef.current[activeMapId]);
            } else {
              const savedTransforms = await storage.getSetting('mindsprout_map_transforms', '{}');
              const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
              mapTransformsRef.current = { ...mapTransformsRef.current, ...transforms };
              if (transforms[activeMapId]) {
                setTransform(transforms[activeMapId]);
              } else {
                setTimeout(centerCanvas, 50);
                setTimeout(centerCanvas, 350);
              }
            }
            setTimeout(() => {
              setTree((prev) => prev ? { ...prev } : prev);
            }, 500);
          }
        } catch (err) {
          console.error('Failed to load map content from Google Drive:', err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Local mode
        const localMaps = await getLocalMaps();
        const activeMap = localMaps.find((m) => m.id === activeMapId);
        if (activeMap) {
          const migrated = migrateTree(activeMap.content);
          const finalTree = isAutoLayout ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
          setTree(finalTree);
          setHistory({ past: [], present: finalTree, future: [] });

          // Restore map-specific transform
          if (mapTransformsRef.current[activeMapId]) {
            setTransform(mapTransformsRef.current[activeMapId]);
          } else {
            const savedTransforms = await storage.getSetting('mindsprout_map_transforms', '{}');
            const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
            mapTransformsRef.current = { ...mapTransformsRef.current, ...transforms };
            if (transforms[activeMapId]) {
              setTransform(transforms[activeMapId]);
            } else {
              setTimeout(centerCanvas, 50);
              setTimeout(centerCanvas, 350);
            }
          }
          setTimeout(() => {
            setTree((prev) => prev ? { ...prev } : prev);
          }, 500);
        } else if (localMaps.length > 0) {
          // Fallback
          const migrated = migrateTree(localMaps[0].content);
          const finalTree = isAutoLayout ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
          setTree(finalTree);
          setActiveMapId(localMaps[0].id);
          setHistory({ past: [], present: finalTree, future: [] });

          // Restore map-specific transform
          const targetId = localMaps[0].id;
          if (mapTransformsRef.current[targetId]) {
            setTransform(mapTransformsRef.current[targetId]);
          } else {
            const savedTransforms = await storage.getSetting('mindsprout_map_transforms', '{}');
            const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
            mapTransformsRef.current = { ...mapTransformsRef.current, ...transforms };
            if (transforms[targetId]) {
              setTransform(transforms[targetId]);
            } else {
              setTimeout(centerCanvas, 50);
              setTimeout(centerCanvas, 350);
            }
          }
          setTimeout(() => {
            setTree((prev) => prev ? { ...prev } : prev);
          }, 500);
        }
      }
    };

    loadActiveMapContent();
  }, [activeMapId, user, getLocalMaps, centerCanvas, isAutoLayout, getValidToken, isMapsListLoaded]);

  // --- Sync / Auto Save Content ---
  const saveMapData = useCallback((currentTree: MindMapNode, forceImmediate = false) => {
    const timeString = new Date().toISOString();
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');
    const targetFileId = activeMapId;

    // 1. Always update storage immediately for fast offline saving
    storage.saveMap(targetFileId, currentTree.text, currentTree, timeString);

    // Sync metadata title and time in mapsList state instantly
    setMapsList((prev) =>
      prev.map((m) => (m.id === targetFileId ? { ...m, title: currentTree.text, updated_at: timeString } : m))
    );

    // 2. Google Drive upload
    if (isConnected) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const performUpload = async () => {
        setSyncStatus('syncing');
        try {
          const token = await getValidToken();
          await googleDriveClient.updateSproutFile(token, targetFileId, {
            id: targetFileId,
            title: currentTree.text,
            content: currentTree
          });

          const currentMeta = mapsList.find(m => m.id === targetFileId);
          if (currentMeta && currentMeta.title !== currentTree.text) {
            await googleDriveClient.renameSproutFile(token, targetFileId, currentTree.text);
          }
          setSyncStatus('saved');
        } catch (err) {
          console.error('Failed to sync content with Google Drive:', err);
          setSyncStatus('error');
        }
      };

      if (forceImmediate) {
        performUpload();
      } else {
        // Only mark as dirty (unsaved local changes), do NOT schedule background upload!
        setSyncStatus('dirty');
      }
    }
  }, [activeMapId, getLocalMaps, getValidToken, mapsList]);

  // Tree modifier with history
  const updateTreeState = useCallback((newTree: MindMapNode) => {
    setTree(newTree);
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newTree,
      future: []
    }));
    saveMapData(newTree);
  }, [saveMapData]);

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
  const switchMap = useCallback((id: string) => {
    // Force save unsaved changes immediately before switching
    if (syncStatus === 'dirty') {
      saveMapData(tree, true);
    }
    setActiveMapId(id);
    storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, id);
    setSelectedId('root');
    setEditingId(null);
  }, [tree, saveMapData, syncStatus]);

  // --- Create Map ---
  const createNewMap = useCallback(async (title?: string) => {
    const finalTitle = title || t('untitledMap');
    const initialTree = {
      id: 'root',
      text: finalTitle,
      children: []
    };
    const timeString = new Date().toISOString();
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');

    if (isConnected) {
      setIsSyncing(true);
      try {
        const token = await getValidToken();
        const folderId = localStorage.getItem('google_folder_id') || googleFolderId;
        if (!folderId) throw new Error('Google Folder ID not set');

        const fileId = await googleDriveClient.createSproutFile(token, folderId, finalTitle, {
          id: '',
          title: finalTitle,
          content: initialTree
        });

        setMapsList((prev) => [{ id: fileId, title: finalTitle, updated_at: timeString }, ...prev]);
        switchMap(fileId);
      } catch (err) {
        console.error('Failed to create new map in Google Drive:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const newId = Math.random().toString(36).substring(2, 9);
      const newMap = {
        id: newId,
        title: finalTitle,
        content: initialTree,
        updated_at: timeString
      };
      const localMaps = await getLocalMaps();
      const updated = [newMap, ...localMaps];
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
      switchMap(newId);
    }
  }, [user, switchMap, getLocalMaps, getValidToken, googleFolderId, t]);

  // --- Delete Map ---
  const deleteMap = useCallback(async (id: string) => {
    if (mapsList.length <= 1) {
      alert(t('atLeastOneMap'));
      return;
    }

    if (id === activeMapId) {
      // Switch active target to next available
      const remaining = mapsList.filter((m) => m.id !== id);
      switchMap(remaining[0].id);
    }

    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');

    if (isConnected) {
      setIsSyncing(true);
      try {
        const token = await getValidToken();
        await googleDriveClient.deleteSproutFile(token, id);

        // Also remove from local storage to prevent it from being treated as an unmigrated local map on refetch
        const localMaps = await getLocalMaps();
        const updatedLocal = localMaps.filter((m) => m.id !== id);
        localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updatedLocal));

        // Filter out from the custom sorting order
        const savedOrder = localStorage.getItem('mindsprout_maps_order');
        if (savedOrder) {
          try {
            const orderIds = JSON.parse(savedOrder);
            const newOrder = orderIds.filter((oid: string) => oid !== id);
            storage.setSetting('mindsprout_maps_order', JSON.stringify(newOrder));
          } catch (e) {
            console.error(e);
          }
        }

        setMapsList((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error('Failed to delete map from Google Drive:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const localMaps = await getLocalMaps();
      const updated = localMaps.filter((m) => m.id !== id);
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
    }
  }, [activeMapId, mapsList, user, switchMap, getLocalMaps, getValidToken]);

  // --- Rename Map ---
  const renameMap = useCallback(async (id: string, newTitle: string) => {
    if (newTitle.trim() === '') return;
    const timeString = new Date().toISOString();
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');

    if (isConnected) {
      setIsSyncing(true);
      try {
        const token = await getValidToken();
        await googleDriveClient.renameSproutFile(token, id, newTitle);
        
        setMapsList((prev) =>
          prev.map((m) => (m.id === id ? { ...m, title: newTitle, updated_at: timeString } : m))
        );

        if (id === activeMapId) {
          setTree((prev) => ({ ...prev, text: newTitle }));
        }
      } catch (err) {
        console.error('Failed to rename map in Google Drive:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const localMaps = await getLocalMaps();
      const updated = localMaps.map((m) => {
        if (m.id === id) {
          const updatedContent = { ...m.content, text: newTitle };
          return {
            ...m,
            title: newTitle,
            content: updatedContent,
            updated_at: timeString
          };
        }
        return m;
      });
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
      
      if (id === activeMapId) {
        setTree((prev) => ({ ...prev, text: newTitle }));
      }
    }
  }, [user, activeMapId, getLocalMaps, getValidToken]);

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
    // If the imported tree doesn't have a valid ID or structure, fix it
    const sanitized = {
      ...newTree,
      id: newTree.id || 'root'
    };
    const migrated = migrateTree(sanitized);
    const title = migrated.text || t('importedMap');
    const timeString = new Date().toISOString();
    const isConnected = !isElectron && (localStorage.getItem('google_drive_connected') === 'true');

    if (isConnected) {
      setIsSyncing(true);
      try {
        const token = await getValidToken();
        const folderId = localStorage.getItem('google_folder_id') || googleFolderId;
        if (!folderId) throw new Error('Google Folder ID not set');

        const fileId = await googleDriveClient.createSproutFile(token, folderId, title, {
          id: '',
          title,
          content: migrated
        });

        setMapsList((prev) => [{ id: fileId, title, updated_at: timeString }, ...prev]);
        setActiveMapId(fileId);
        storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, fileId);
        
        // Instantly set states to prevent loading delay
        setTree(migrated);
        setHistory({
          past: [],
          present: migrated,
          future: []
        });
        setSelectedId('root');
        setEditingId(null);
        setTimeout(() => centerCanvas(), 100);
      } catch (err) {
        console.error('Failed to import map to Google Drive:', err);
        alert(t('importFailed'));
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const newId = Math.random().toString(36).substring(2, 9);
      const newMap = {
        id: newId,
        title,
        content: migrated, // Use the imported migrated tree
        updated_at: timeString
      };
      const localMaps = await getLocalMaps();
      const updated = [newMap, ...localMaps];
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
      setActiveMapId(newId);
      storage.setSetting(LOCAL_STORAGE_ACTIVE_ID_KEY, newId);
      
      // Instantly set states
      setTree(migrated);
      setHistory({
        past: [],
        present: migrated,
        future: []
      });
      setSelectedId('root');
      setEditingId(null);
      setTimeout(() => centerCanvas(), 100);
    }
  }, [user, getLocalMaps, centerCanvas, getValidToken, googleFolderId, t]);

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

  // --- Auth Operations ---
  const loginWithGoogle = async () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      console.error('Google client not initialized yet');
    }
  };

  const logout = async () => {
    logoutGoogle();
  };

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
    user,
    isSyncing,
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
    loginWithGoogle,
    logout,
    switchMap,
    createNewMap,
    deleteMap,
    renameMap,
    updateNodeOffsetSilent,
    commitTreeState,
    createFloatingNode,
    reparentNode,
    reorderNode,
    isOutlinerMode,
    setIsOutlinerMode,
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
    isGoogleDriveConfigured: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
    isSupabaseConfigured: !!import.meta.env.VITE_GOOGLE_CLIENT_ID
  };
};
