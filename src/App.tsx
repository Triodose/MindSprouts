import { useState, useRef, useEffect } from 'react';
import { useMindMap } from './hooks/useMindMap';
import { MindMapNode } from './components/MindMapNode';
import { SVGConnections } from './components/SVGConnections';
import { Toolbar } from './components/Toolbar';
import { Inspector } from './components/Inspector';
import { MapListSidebar } from './components/MapListSidebar';
import { ShortcutHelper } from './components/ShortcutHelper';
import { Outliner } from './components/Outliner';
import { findNode } from './utils/treeUtils';
import { navigateLeft, navigateRight, navigateVertical } from './utils/treeNavigation';
import type { SummaryPosition } from './types/mindmap';
import { StickyNote } from 'lucide-react';

interface NotePopoverProps {
  nodeId: string;
  initialNote: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

const NotePopover: React.FC<NotePopoverProps> = ({ nodeId, initialNote, onSave, onClose }) => {
  const [text, setText] = useState(initialNote);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
  };

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    const container = document.querySelector('.tree-container');
    if (container) {
      container.addEventListener('scroll', updatePosition);
    }
    
    let animFrameId: number;
    const loop = () => {
      updatePosition();
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', updatePosition);
      if (container) {
        container.removeEventListener('scroll', updatePosition);
      }
      cancelAnimationFrame(animFrameId);
    };
  }, [nodeId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const toolbarNoteBtn = document.querySelector('.toolbar-note-btn');
      if (toolbarNoteBtn?.contains(e.target as Node)) {
        return;
      }
      const noteIndicator = (e.target as HTMLElement).closest('.node-note-indicator');
      if (noteIndicator) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [onClose]);

  const handleChange = (newText: string) => {
    setText(newText);
    onSave(newText);
  };

  if (!pos) return null;

  return (
    <div
      ref={popoverRef}
      className="glass-panel note-popover-editor"
      style={{
        position: 'absolute',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform: 'translateX(-50%)',
        width: '280px',
        padding: '12px',
        borderRadius: '8px',
        zIndex: 1100,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--theme-glass-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        animation: 'fadeInUp 0.15s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <StickyNote size={12} /> 編輯備註
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--theme-text-color)',
            opacity: 0.6,
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            padding: '2px'
          }}
          title="關閉"
        >
          ✕
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="輸入此主題的備註內容..."
        style={{
          width: '100%',
          height: '90px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--theme-glass-border)',
          borderRadius: '4px',
          padding: '8px',
          color: 'var(--theme-text-color)',
          fontSize: '12px',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
        autoFocus
      />
    </div>
  );
};

export default function App() {
  const {
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
    isGoogleDriveConfigured
  } = useMindMap();

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [activeNoteNodeId, setActiveNoteNodeId] = useState<string | null>(null);
  const [summaryPositions, setSummaryPositions] = useState<SummaryPosition[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Global UI Application Theme (Light / Dark)
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('mindsprout_ui_theme') as 'light' | 'dark') || 'dark';
  });
  const toggleUiTheme = () => {
    setUiTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('mindsprout_ui_theme', next);
      return next;
    });
  };

  const handleNodeSelect = (nodeId: string | null) => {
    if (connectingSourceId && nodeId) {
      completeConnection(nodeId);
    } else {
      setSelectedId(nodeId);
      setSelectedRelId(null);
    }
  };
  
  // Panning tracking states
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Focus the canvas on initial mount to enable keyboard shortcuts immediately
  useEffect(() => {
    canvasRef.current?.focus();
  }, []);

  // --- Pan / Zoom Canvas Interactions ---
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on left click on the canvas background, not on buttons or panels
    const target = e.target as HTMLElement;
    if (
      target.closest('.glass-panel') || 
      target.closest('.node-card') || 
      target.closest('.collapse-badge') ||
      target.closest('.sidebar-toggle-btn') ||
      target.closest('.map-sidebar') ||
      target.closest('.relationship-label-card') ||
      target.closest('.connection-path')
    ) {
      return;
    }

    isPanningRef.current = true;
    startPanRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y
    };
    
    // Clear selection on background click
    setSelectedId(null);
    setEditingId(null);
    setSelectedRelId(null);

    // Keep focus on canvas for keyboard shortcuts
    canvasRef.current?.focus();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;

    const dx = e.clientX - startPanRef.current.x;
    const dy = e.clientY - startPanRef.current.y;

    setTransform((prev) => ({
      ...prev,
      x: startPanRef.current.tx + dx,
      y: startPanRef.current.ty + dy
    }));
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Stop page scrolling
    
    if (e.ctrlKey) {
      // Zoom centered on the cursor position (Ctrl + Wheel)
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;

      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;

      const zoomSpeed = 0.08;
      const zoomFactor = e.deltaY < 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      const minZoom = 0.3;
      const maxZoom = 2.5;

      setTransform((prev) => {
        const nextZoom = Math.min(maxZoom, Math.max(minZoom, prev.zoom * zoomFactor));
        
        // Zoom centered on the cursor position
        const dx = mouseX - (mouseX - prev.x) * (nextZoom / prev.zoom);
        const dy = mouseY - (mouseY - prev.y) * (nextZoom / prev.zoom);

        return {
          x: dx,
          y: dy,
          zoom: nextZoom
        };
      });
    } else {
      // Pan canvas with normal scroll (Wheel scroll = Pan)
      setTransform((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Only trigger if clicking exactly on the canvas background, not on panels or nodes!
    const target = e.target as HTMLElement;
    if (
      target.closest('.glass-panel') || 
      target.closest('.node-card') || 
      target.closest('.node-container') ||
      target.closest('.tree-branch') ||
      target.closest('.collapse-badge') ||
      target.closest('.sidebar-toggle-btn') ||
      target.closest('.map-sidebar')
    ) {
      return;
    }

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Position of double-click relative to the canvas viewport
    const clickX = e.clientX - canvasRect.left;
    const clickY = e.clientY - canvasRect.top;

    // Convert screen coordinates to canvas coordinates based on current zoom and pan offset
    const canvasX = (clickX - transform.x) / transform.zoom;
    const canvasY = (clickY - transform.y) / transform.zoom;

    createFloatingNode(canvasX, canvasY);
  };

  // Zoom Actions for Toolbar
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.min(2.5, prev.zoom * 1.2)
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.3, prev.zoom / 1.2)
    }));
  };

  // --- Keyboard Shortcuts ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If typing in any input, textarea, or if editingId is active, ignore global keys
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (editingId || isTyping) return;

    const key = e.key;

    if (key === 'Tab') {
      e.preventDefault();
      if (selectedId) addNodeChild(selectedId);
    } else if (key === 'Enter') {
      e.preventDefault();
      if (selectedId) addNodeSibling(selectedId);
    } else if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      if (selectedRelId) {
        deleteRelationshipSelected(selectedRelId);
        setSelectedRelId(null);
      } else if (selectedId && selectedId !== 'root') {
        deleteNodeSelected(selectedId);
      }
    } else if (key === ' ') {
      e.preventDefault();
      if (selectedId) setEditingId(selectedId);
    } else if (key === 'Escape') {
      e.preventDefault();
      if (connectingSourceId) {
        cancelConnection();
      } else {
        setSelectedId(null);
        setEditingId(null);
        setSelectedRelId(null);
      }
    } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      redo();
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      if (selectedId) {
        setSelectedId(navigateVertical(tree, selectedId, 'up'));
      }
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      if (selectedId) {
        setSelectedId(navigateVertical(tree, selectedId, 'down'));
      }
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      if (selectedId) {
        setSelectedId(navigateLeft(tree, selectedId));
      }
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      if (selectedId) {
        setSelectedId(navigateRight(tree, selectedId));
      }
    }
  };

  // Find selected node detail to pass to Inspector
  const selectedNodeDetail = selectedId ? findNode(tree, selectedId) : null;

  const handleOpenNoteEditor = (nodeId: string) => {
    setActiveNoteNodeId(nodeId);
  };

  const handleToolbarAddNote = () => {
    if (selectedId) {
      if (activeNoteNodeId === selectedId) {
        setActiveNoteNodeId(null);
      } else {
        setActiveNoteNodeId(selectedId);
      }
    }
  };

  // UI Theme styling values
  const uiStyles = uiTheme === 'light' ? {
    textColor: '#1e293b', // slate-800
    glassBackground: 'rgba(255, 255, 255, 0.98)', // Opaque white glass
    glassBorder: 'rgba(15, 23, 42, 0.08)',
    panelShadow: '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
    uiAccentColor: '#2563eb' // Fixed accent color for Light UI
  } : {
    textColor: '#f8fafc', // slate-50
    glassBackground: 'rgba(15, 23, 42, 0.98)', // Opaque dark slate glass
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    panelShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
    uiAccentColor: '#38bdf8' // Fixed accent color for Dark UI
  };

  // Build root inline theme styles mapping CSS Variables
  const appStyles: any = {
    // Canvas background
    '--theme-background': theme.background,
    
    // Root Node defaults
    '--theme-root-background': theme.rootBackground,
    '--theme-root-color': theme.rootColor,
    '--theme-root-border': theme.rootBorder,
    
    // Sub Nodes defaults
    '--theme-node-default-background': theme.nodeDefaultBackground,
    '--theme-node-default-color': theme.nodeDefaultColor,
    '--theme-node-default-border': theme.nodeDefaultBorder,
  };

  // Populate level-specific CSS variables (up to level 4, clamped at 4+)
  for (let i = 0; i <= 4; i++) {
    appStyles[`--theme-level-${i}-background`] = (theme.levelBackgrounds && theme.levelBackgrounds[i]) || (i === 0 ? theme.rootBackground : theme.nodeDefaultBackground);
    appStyles[`--theme-level-${i}-color`] = (theme.levelColors && theme.levelColors[i]) || (i === 0 ? theme.rootColor : theme.nodeDefaultColor);
    appStyles[`--theme-level-${i}-border`] = (theme.levelBorders && theme.levelBorders[i]) || (i === 0 ? theme.rootBorder : theme.nodeDefaultBorder);
  }

  // Add the remaining properties to appStyles
  Object.assign(appStyles, {
    // Connections / branches defaults
    '--theme-line-color': theme.lineColor,
    
    // Relationship lines defaults
    '--theme-rel-line-color': theme.relLineColor,
    '--theme-rel-line-active-color': theme.relLineActiveColor,
    '--theme-rel-label-background': theme.relLabelBackground,
    '--theme-rel-label-color': theme.relLabelColor,

    '--theme-accent-color': theme.accentColor,

    // Global UI Theme overrides (Floating panels, sidebar, inspector)
    '--theme-text-color': uiStyles.textColor,
    '--theme-glass-background': uiStyles.glassBackground,
    '--theme-glass-border': uiStyles.glassBorder,
    '--theme-panel-shadow': uiStyles.panelShadow,
    '--theme-ui-accent-color': uiStyles.uiAccentColor,

    background: theme.background
  });

  const rootNode = tree.children.find((c) => c.id === 'root');
  const isTimelineMode = rootNode?.style?.structure === 'timeline';

  return (
    <div className="mindmap-app" style={appStyles}>
      {/* 1. Main Work Area (Canvas or Outliner) */}
      {isOutlinerMode ? (
        <Outliner
          tree={tree}
          selectedId={selectedId}
          theme={theme}
          setSelectedId={setSelectedId}
          updateNodeText={updateNodeText}
          addNodeSibling={addNodeSibling}
          deleteNodeSelected={deleteNodeSelected}
          indentNodeSelected={indentNodeSelected}
          outdentNodeSelected={outdentNodeSelected}
        />
      ) : (
        <div
          ref={canvasRef}
          className="canvas-container"
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleCanvasDoubleClick}
        >
          <div
            className="canvas-transform"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`
            }}
          >
            <div className="tree-container">
              {/* SVG Connections Overlay */}
              <SVGConnections 
                tree={tree} 
                themeLineColor={theme.lineColor} 
                themeBranchColors={theme.branchColors} 
                zoom={transform.zoom} 
                redrawTrigger={transform} 
                selectedRelId={selectedRelId}
                onSelectRel={setSelectedRelId}
                onUpdateRelText={updateRelationshipLabel}
                selectedNodeId={selectedId}
                onUpdateSummaryPositions={setSummaryPositions}
              />
              
              {/* Render all Summary Sub-trees */}
              {summaryPositions.map((pos) => {
                let translateStr = 'translate(0%, -50%)';
                if (pos.direction === 'left') translateStr = 'translate(-100%, -50%)';
                else if (pos.direction === 'down') translateStr = 'translate(-50%, 0%)';

                return (
                  <div
                    key={pos.id}
                    className="summary-tree-wrapper"
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: translateStr,
                      zIndex: 8,
                      pointerEvents: 'auto'
                    }}
                  >
                    <MindMapNode
                      node={pos.node}
                      parent={tree}
                      selectedId={selectedId}
                      editingId={editingId}
                      zoom={transform.zoom}
                      isAutoLayout={isAutoLayout}
                      isTopLevel={false}
                      isLeft={pos.direction === 'left'}
                      onSelect={handleNodeSelect}
                      onStartEdit={setEditingId}
                      onEndEdit={() => setEditingId(null)}
                      onUpdateText={updateNodeText}
                      onToggleCollapse={toggleCollapse}
                      onUpdateOffset={updateNodeOffsetSilent}
                      onEndDrag={commitTreeState}
                      onReparent={reparentNode}
                      onReorder={reorderNode}
                      onUpdateData={updateNodeData}
                      onOpenNoteEditor={handleOpenNoteEditor}
                      isRoot={false}
                      depth={0}
                      theme={theme}
                    />
                  </div>
                );
              })}
              
              {/* Render all top-level trees (Main Root + Floating Topics) */}
              {tree.children.map((child) => (
                <MindMapNode
                  key={child.id}
                  node={child}
                  parent={tree}
                  selectedId={selectedId}
                  editingId={editingId}
                  zoom={transform.zoom}
                  isAutoLayout={isAutoLayout}
                  isTopLevel={true}
                  onSelect={handleNodeSelect}
                  onStartEdit={setEditingId}
                  onEndEdit={() => setEditingId(null)}
                  onUpdateText={updateNodeText}
                  onToggleCollapse={toggleCollapse}
                  onUpdateOffset={updateNodeOffsetSilent}
                  onEndDrag={commitTreeState}
                  onReparent={reparentNode}
                  onReorder={reorderNode}
                  onUpdateData={updateNodeData}
                  onOpenNoteEditor={handleOpenNoteEditor}
                  isRoot={child.id === 'root'}
                  depth={0}
                  theme={theme}
                  isTimelineMode={isTimelineMode}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating relationship connection helper banner */}
      {connectingSourceId && (
        <div 
          className="glass-panel" 
          style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            borderRadius: '30px',
            background: 'var(--theme-accent-color)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'pulse-toast 1.5s infinite alternate'
          }}
        >
          <span>🔗 關聯線連接模式：請點擊另一個節點建立關聯，或按 Esc 取消</span>
          <button 
            onClick={cancelConnection} 
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '10px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Floating Panels */}
      {/* Left Sidebar: MindMap Document List */}
      <MapListSidebar
        mapsList={mapsList}
        activeMapId={activeMapId}
        onSwitchMap={switchMap}
        onCreateNewMap={createNewMap}
        onDeleteMap={deleteMap}
        onRenameMap={renameMap}
        onReorderMaps={reorderMapsList}
      />

      {/* Top Toolbar */}
      <Toolbar
        selectedId={selectedId}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        tree={tree}
        isOutlinerMode={isOutlinerMode}
        onToggleOutlinerMode={setIsOutlinerMode}
        onAddChild={addNodeChild}
        onAddSibling={addNodeSibling}
        onDeleteSelected={deleteNodeSelected}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterCanvas={centerCanvas}
        onImportTree={importTree}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        connectingSourceId={connectingSourceId}
        onStartConnection={startConnection}
        onCancelConnection={cancelConnection}
        onAddNoteClick={handleToolbarAddNote}
        uiTheme={uiTheme}
        onToggleUiTheme={toggleUiTheme}
      />

      {/* Right Inspector Sidebar */}
      <Inspector
        selectedId={selectedId}
        selectedNode={selectedNodeDetail}
        tree={tree}
        theme={theme}
        user={user}
        isSyncing={isSyncing}
        isGoogleDriveConfigured={isGoogleDriveConfigured}
        isAutoLayout={isAutoLayout}
        onToggleAutoLayout={toggleAutoLayout}
        onUpdateStyle={updateNodeStyle}
        onApplyStyleToLevel={applyStyleToLevel}
        onUpdateData={updateNodeData}
        onChangeTheme={changeTheme}
        onLogin={loginWithGoogle}
        onLogout={logout}
        onAddSummary={addSummary}
        onUpdateSummaryRange={updateSummaryRange}
        onDeleteSummary={deleteSummary}
      />

      {/* Shortcuts overlay help dialog */}
      <ShortcutHelper
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating Note Editor Popover */}
      {activeNoteNodeId && (
        <NotePopover
          nodeId={activeNoteNodeId}
          initialNote={findNode(tree, activeNoteNodeId)?.note || ''}
          onSave={(text) => {
            updateNodeData(activeNoteNodeId, { note: text || undefined });
          }}
          onClose={() => setActiveNoteNodeId(null)}
        />
      )}
    </div>
  );
}
