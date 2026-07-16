import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { MindMapNode, CanvasTransform, MindMapTheme, HistoryState } from '../types/mindmap';
import { DEFAULT_THEME, THEMES } from '../utils/themes';
import * as treeUtils from '../utils/treeUtils';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import type { User } from '@supabase/supabase-js';

const LOCAL_STORAGE_MAPS_KEY = 'mindsprout_local_maps';
const LOCAL_STORAGE_ACTIVE_ID_KEY = 'mindsprout_active_map_id';

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
  // MindMaps List Metadata
  const [mapsList, setMapsList] = useState<MindMapMetadata[]>([]);
  const [activeMapId, setActiveMapId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY) || 'default-map';
  });

  // Current Active Tree State
  const [tree, setTree] = useState<MindMapNode>(() => treeUtils.createInitialTree());

  // Outliner Mode Toggle
  const [isOutlinerMode, setIsOutlinerMode] = useState<boolean>(false);

  // Auto Layout / Snap alignment mode toggle (persisted to LocalStorage, defaults to true)
  const [isAutoLayout, setIsAutoLayout] = useState<boolean>(() => {
    const saved = localStorage.getItem('mindsprout_auto_layout');
    return saved === null ? true : saved === 'true';
  });

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

  // Supabase Auth States
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync state reference to avoid stale updates
  const saveTimeoutRef = useRef<any | null>(null);
  const activeMapIdRef = useRef(activeMapId);

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

  // --- Auth Handling ---
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- Local Mode Helper ---
  // Seed initial local maps if empty
  const getLocalMaps = useCallback((): any[] => {
    const saved = localStorage.getItem(LOCAL_STORAGE_MAPS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const initialTree = treeUtils.createInitialTree();
    const defaultMaps = [
      {
        id: 'default-map',
        title: initialTree.text,
        content: initialTree,
        updated_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(defaultMaps));
    return defaultMaps;
  }, []);

  // --- Custom Sort Order Helper ---
  const applyCustomSort = useCallback((items: any[]) => {
    const savedOrder = localStorage.getItem('mindsprout_maps_order');
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
    if (supabase && user) {
      setIsSyncing(true);
      try {
        // 1. Fetch current maps from Supabase
        const { data, error } = await supabase
          .from('mindsprouts_mindmaps')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // 2. Check if we have local maps that need to be migrated
        const localMaps = getLocalMaps();
        // A map needs migration if its ID is 'default-map' or is not a valid UUID format,
        // or if its ID is not present in the Supabase data list.
        const unmigratedMaps = localMaps.filter(lm => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lm.id);
          return !isUuid || (data && !data.some(sm => sm.id === lm.id));
        });

        let updatedSupabaseData = data ? [...data] : [];

        if (unmigratedMaps.length > 0) {
          console.log(`Found ${unmigratedMaps.length} unmigrated local maps. Uploading to Supabase...`);
          const migratedLocalMaps = [...localMaps];

          for (const localMap of unmigratedMaps) {
            try {
              // Insert into Supabase (let database generate UUID)
              const { data: newMap, error: insertError } = await supabase
                .from('mindsprouts_mindmaps')
                .insert({
                  title: localMap.title,
                  content: localMap.content,
                  user_id: user.id
                })
                .select()
                .single();

              if (insertError) throw insertError;

              if (newMap) {
                // Find index of this local map and update its ID in local storage to the new UUID
                const idx = migratedLocalMaps.findIndex(m => m.id === localMap.id);
                if (idx !== -1) {
                  migratedLocalMaps[idx] = {
                    ...migratedLocalMaps[idx],
                    id: newMap.id,
                    updated_at: newMap.updated_at
                  };
                }
                
                // If the migrated map was the currently active map, update the active map ID
                if (activeMapId === localMap.id) {
                  setActiveMapId(newMap.id);
                  localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, newMap.id);
                }

                updatedSupabaseData.push({
                  id: newMap.id,
                  title: newMap.title,
                  updated_at: newMap.updated_at
                });
              }
            } catch (migrationErr) {
              console.error('Failed to migrate local map:', localMap.title, migrationErr);
            }
          }

          // Save the updated IDs back to LocalStorage
          localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(migratedLocalMaps));
          // Sort by custom order or updated_at descending
          updatedSupabaseData = applyCustomSort(updatedSupabaseData);
        }

        // 3. Update the state with the combined/migrated list
        if (updatedSupabaseData.length > 0) {
          setMapsList(applyCustomSort(updatedSupabaseData));
          if (!updatedSupabaseData.some((m) => m.id === activeMapId)) {
            setActiveMapId(updatedSupabaseData[0].id);
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, updatedSupabaseData[0].id);
          }
        } else {
          // If Supabase is still empty (highly unlikely now), fallback to create default
          const initial = treeUtils.createInitialTree();
          const { data: newMap, error: insertError } = await supabase
            .from('mindsprouts_mindmaps')
            .insert({
              title: initial.text,
              content: initial,
              user_id: user.id
            })
            .select()
            .single();

          if (insertError) throw insertError;
          if (newMap) {
            setMapsList([{ id: newMap.id, title: newMap.title, updated_at: newMap.updated_at }]);
            setActiveMapId(newMap.id);
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, newMap.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch maps from Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local mode
      const localMaps = getLocalMaps();
      const list = localMaps.map((m) => ({
        id: m.id,
        title: m.title,
        updated_at: m.updated_at
      }));
      setMapsList(applyCustomSort(list));
      
      // Keep active id consistent
      if (!list.some((m) => m.id === activeMapId) && list.length > 0) {
        setActiveMapId(list[0].id);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, list[0].id);
      }
    }
  }, [user, activeMapId, getLocalMaps, applyCustomSort]);

  // Trigger fetch when user status changes or active ID switches locally
  useEffect(() => {
    fetchMapsList();
  }, [user]);

  // --- Load Selected Map Content ---
  useEffect(() => {
    const loadActiveMapContent = async () => {
      if (supabase && user) {
        setIsSyncing(true);
        try {
          const { data, error } = await supabase
            .from('mindsprouts_mindmaps')
            .select('content')
            .eq('id', activeMapId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            const parsed = data.content as MindMapNode;
            const migrated = migrateTree(parsed);
            const finalTree = isAutoLayout ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
            setTree(finalTree);
            setHistory({ past: [], present: finalTree, future: [] });

            // Restore map-specific transform
            const savedTransforms = localStorage.getItem('mindsprout_map_transforms');
            const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
            if (transforms[activeMapId]) {
              setTransform(transforms[activeMapId]);
            } else {
              setTimeout(centerCanvas, 50);
              setTimeout(centerCanvas, 350);
            }
            setTimeout(() => {
              setTree((prev) => prev ? { ...prev } : prev);
            }, 500);
          }
        } catch (err) {
          console.error('Failed to load map content:', err);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Local mode
        const localMaps = getLocalMaps();
        const activeMap = localMaps.find((m) => m.id === activeMapId);
        if (activeMap) {
          const migrated = migrateTree(activeMap.content);
          const finalTree = isAutoLayout ? treeUtils.clearSubNodeOffsets(migrated) : migrated;
          setTree(finalTree);
          setHistory({ past: [], present: finalTree, future: [] });

          // Restore map-specific transform
          const savedTransforms = localStorage.getItem('mindsprout_map_transforms');
          const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
          if (transforms[activeMapId]) {
            setTransform(transforms[activeMapId]);
          } else {
            setTimeout(centerCanvas, 50);
            setTimeout(centerCanvas, 350);
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
          const savedTransforms = localStorage.getItem('mindsprout_map_transforms');
          const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
          if (transforms[localMaps[0].id]) {
            setTransform(transforms[localMaps[0].id]);
          } else {
            setTimeout(centerCanvas, 50);
            setTimeout(centerCanvas, 350);
          }
          setTimeout(() => {
            setTree((prev) => prev ? { ...prev } : prev);
          }, 500);
        }
      }
    };

    loadActiveMapContent();
  }, [activeMapId, user, getLocalMaps, centerCanvas, isAutoLayout]);

  // --- Sync / Auto Save Content ---
  const saveMapData = useCallback(async (currentTree: MindMapNode) => {
    const timeString = new Date().toISOString();

    if (supabase && user) {
      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from('mindsprouts_mindmaps')
          .update({
            title: currentTree.text,
            content: currentTree,
            updated_at: timeString
          })
          .eq('id', activeMapId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Update list metadata titles
        setMapsList((prev) =>
          prev.map((m) => (m.id === activeMapId ? { ...m, title: currentTree.text, updated_at: timeString } : m))
        );
      } catch (err) {
        console.error('Failed to sync content with Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local mode
      const localMaps = getLocalMaps();
      const updated = localMaps.map((m) => {
        if (m.id === activeMapId) {
          return {
            ...m,
            title: currentTree.text,
            content: currentTree,
            updated_at: timeString
          };
        }
        return m;
      });
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      // Update list state
      setMapsList((prev) =>
        prev.map((m) => (m.id === activeMapId ? { ...m, title: currentTree.text, updated_at: timeString } : m))
      );
    }
  }, [user, activeMapId, getLocalMaps]);

  // Tree modifier with history
  const updateTreeState = useCallback((newTree: MindMapNode) => {
    setTree(newTree);
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newTree,
      future: []
    }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveMapData(newTree);
    }, 800);
  }, [saveMapData]);

  // Save transform state
  useEffect(() => {
    // Only save the transform if it's for the currently active map, 
    // and ONLY if the activeMapId in the ref matches the current activeMapId.
    if (activeMapId && activeMapId === activeMapIdRef.current) {
      const savedTransforms = localStorage.getItem('mindsprout_map_transforms');
      const transforms = savedTransforms ? JSON.parse(savedTransforms) : {};
      transforms[activeMapId] = transform;
      localStorage.setItem('mindsprout_map_transforms', JSON.stringify(transforms));
    }
    // Update the ref to the current activeMapId
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
    // If there is a pending debounced save, clear it and force save the current tree immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveMapData(tree);
    }
    setActiveMapId(id);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, id);
    setSelectedId('root');
    setEditingId(null);
  }, [tree, saveMapData]);

  // --- Create Map ---
  const createNewMap = useCallback(async (title = '未命名心智圖') => {
    const initialTree = {
      id: 'root',
      text: title,
      children: []
    };
    const timeString = new Date().toISOString();

    if (supabase && user) {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
          .from('mindsprouts_mindmaps')
          .insert({
            title,
            content: initialTree,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMapsList((prev) => [{ id: data.id, title: data.title, updated_at: data.updated_at }, ...prev]);
          switchMap(data.id);
        }
      } catch (err) {
        console.error('Failed to create new map in Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const newId = Math.random().toString(36).substring(2, 9);
      const newMap = {
        id: newId,
        title,
        content: initialTree,
        updated_at: timeString
      };
      const localMaps = getLocalMaps();
      const updated = [newMap, ...localMaps];
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
      switchMap(newId);
    }
  }, [user, switchMap, getLocalMaps]);

  // --- Delete Map ---
  const deleteMap = useCallback(async (id: string) => {
    if (mapsList.length <= 1) {
      alert('至少必須保留一張心智圖！');
      return;
    }

    if (id === activeMapId) {
      // Switch active target to next available
      const remaining = mapsList.filter((m) => m.id !== id);
      switchMap(remaining[0].id);
    }

    if (supabase && user) {
      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from('mindsprouts_mindmaps')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        // Also remove from local storage to prevent it from being treated as an unmigrated local map on refetch
        const localMaps = getLocalMaps();
        const updatedLocal = localMaps.filter((m) => m.id !== id);
        localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updatedLocal));

        // Filter out from the custom sorting order
        const savedOrder = localStorage.getItem('mindsprout_maps_order');
        if (savedOrder) {
          try {
            const orderIds = JSON.parse(savedOrder);
            const newOrder = orderIds.filter((oid: string) => oid !== id);
            localStorage.setItem('mindsprout_maps_order', JSON.stringify(newOrder));
          } catch (e) {
            console.error(e);
          }
        }

        setMapsList((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error('Failed to delete map from Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const localMaps = getLocalMaps();
      const updated = localMaps.filter((m) => m.id !== id);
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
    }
  }, [activeMapId, mapsList, user, switchMap, getLocalMaps]);

  // --- Rename Map ---
  const renameMap = useCallback(async (id: string, newTitle: string) => {
    if (newTitle.trim() === '') return;
    const timeString = new Date().toISOString();

    if (supabase && user) {
      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from('mindsprouts_mindmaps')
          .update({
            title: newTitle,
            updated_at: timeString
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setMapsList((prev) =>
          prev.map((m) => (m.id === id ? { ...m, title: newTitle, updated_at: timeString } : m))
        );

        if (id === activeMapId) {
          setTree((prev) => ({ ...prev, text: newTitle }));
        }
      } catch (err) {
        console.error('Failed to rename map in Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Local Mode
      const localMaps = getLocalMaps();
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
  }, [user, activeMapId, getLocalMaps]);

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
      text: '分支主題',
      children: [],
      style: levelStyle ? { ...levelStyle } : undefined
    };

    const newTree = treeUtils.addChildNode(tree, parentId, newChild);
    updateTreeState(newTree);
    setSelectedId(newId);
    setEditingId(newId);
  }, [tree, updateTreeState]);

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
      text: '分支主題',
      children: [],
      style: levelStyle ? { ...levelStyle } : undefined
    };

    const { newTree, success } = treeUtils.addSiblingNode(tree, targetId, newSibling);
    if (success) {
      updateTreeState(newTree);
      setSelectedId(newId);
      setEditingId(newId);
    }
  }, [tree, updateTreeState, addNodeChild]);

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
      text: '概要',
      style: {
        shape: 'rounded',
        borderStyle: 'solid'
      },
      children: []
    } as any;
    const newTree = treeUtils.addSummary(tree, parent.id, newSummary);
    updateTreeState(newTree);
    setSelectedId(summaryId);
  }, [tree, updateTreeState]);

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
    const title = migrated.text || '匯入的心智圖';
    const timeString = new Date().toISOString();

    if (supabase && user) {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
          .from('mindsprouts_mindmaps')
          .insert({
            title,
            content: migrated, // Use the imported migrated tree as the initial content
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMapsList((prev) => [{ id: data.id, title: data.title, updated_at: data.updated_at }, ...prev]);
          setActiveMapId(data.id);
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, data.id);
          
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
        }
      } catch (err) {
        console.error('Failed to import map in Supabase:', err);
        alert('匯入心智圖失敗！');
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
      const localMaps = getLocalMaps();
      const updated = [newMap, ...localMaps];
      localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(updated));
      
      setMapsList(updated.map(m => ({ id: m.id, title: m.title, updated_at: m.updated_at })));
      setActiveMapId(newId);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, newId);
      
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
  }, [user, getLocalMaps, centerCanvas]);

  // --- Drag Operations ---
  const updateNodeOffsetSilent = useCallback((targetId: string, offset: { x: number; y: number } | undefined) => {
    setTree((prevTree) => treeUtils.updateNode(prevTree, targetId, { offset }));
  }, []);

  const commitTreeState = useCallback((targetId?: string, finalOffset?: { x: number; y: number } | undefined) => {
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
  }, [saveMapData]);

  const createFloatingNode = useCallback((x: number, y: number) => {
    const newId = treeUtils.generateId();
    setTree((latestTree) => {
      const newNode: MindMapNode = {
        id: newId,
        text: '自由主題',
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
  }, [saveMapData]);

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
    localStorage.setItem('mindsprout_auto_layout', String(active));
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
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to log in with Google:', err);
    }
  };

  const logout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setActiveMapId('default-map');
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, 'default-map');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const reorderMapsList = useCallback((startIndex: number, endIndex: number) => {
    setMapsList(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      const orderIds = result.map(m => m.id);
      localStorage.setItem('mindsprout_maps_order', JSON.stringify(orderIds));
      
      // If in Local mode, also update the actual map order in LOCAL_STORAGE_MAPS_KEY
      if (!supabase || !user) {
        const localMaps = getLocalMaps();
        const newLocalMaps = orderIds.map(id => localMaps.find(m => m.id === id)).filter(Boolean);
        localStorage.setItem(LOCAL_STORAGE_MAPS_KEY, JSON.stringify(newLocalMaps));
      }
      
      return result;
    });
  }, [supabase, user, getLocalMaps]);

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
    isSupabaseConfigured: isSupabaseConfigured()
  };
};
