import React, { useState } from 'react';
import { 
  Folder, FileText, Plus, Edit2, Trash2, 
  ChevronRight, Check, X, GripVertical,
  RefreshCw, Settings
} from 'lucide-react';
import { FolderPlus, ChevronDown } from 'lucide-react';
import type { MindMapMetadata, FolderItem } from '../hooks/useMindMap';
import { useI18n } from '../context/I18nContext';

interface MapListSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mapsList: MindMapMetadata[];
  activeMapId: string;
  onSwitchMap: (id: string) => void;
  onCreateNewMap: (title: string, folderId?: string) => void;
  onDeleteMap: (id: string) => void;
  onRenameMap: (id: string, newTitle: string) => void;
  onReorderMaps: (startIndex: number, endIndex: number) => void;
  folders?: FolderItem[];
  mapFolderMap?: Record<string, string>;
  onCreateFolder?: (name?: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onToggleFolderCollapse?: (folderId: string) => void;
  onMoveMapToFolder?: (mapId: string, targetFolderId: string) => void;
  ready: boolean;
  directory: string;
  onChangeWorkspace: () => Promise<void>;
  syncStatus: 'saved' | 'dirty' | 'syncing' | 'error';
}

export const MapListSidebar: React.FC<MapListSidebarProps> = ({
  isOpen, onClose,
  mapsList,
  activeMapId,
  onSwitchMap,
  onCreateNewMap,
  onDeleteMap,
  onRenameMap,
  onReorderMaps,
  folders = [],
  mapFolderMap = {},
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderCollapse,
  onMoveMapToFolder,
  ready,
  directory,
  onChangeWorkspace,
  syncStatus
}) => {
  const { t } = useI18n();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [draggedMapId, setDraggedMapId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  
  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderMaps(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (renameValue.trim() !== '') {
      onRenameMap(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(t('deleteConfirm') + ' (' + title + ')')) {
      onDeleteMap(id);
    }
  };

  return (
    <>
      {/* Sidebar Panel */}
      <div
        className="map-sidebar glass-panel"
        inert={!isOpen}
        aria-label={t('myMindMaps')}
        data-open={isOpen}
        style={{
          position: 'fixed',
          left: '94px',
          top: '104px',
          bottom: '86px',
          width: '260px',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : 'translateX(-420px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'hidden'
        }}
      >
        <div className="focus-panel-heading">
          <strong>{t('myMindMaps')}</strong>
          <div className="focus-library-actions">
            <button type="button" className="focus-icon-button" disabled={!ready || !onCreateFolder} onClick={() => onCreateFolder?.(t('untitledFolder'))} title={t('newFolder')} aria-label={t('newFolder')}><FolderPlus size={17}/></button>
            <button type="button" className="focus-icon-button" onClick={onClose} aria-label={t('closeLibrary')}><X size={17}/></button>
          </div>
        </div>

        {/* Maps & Folders Container */}
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginRight: '-10px',
            paddingRight: '10px'
          }}
        >
          {(folders.length > 0 ? folders : [{ id: 'default', name: t('myMindMaps'), isCollapsed: false }]).map((folder) => {
            const folderMaps = mapsList.filter((m) => {
              const assignedFolder = mapFolderMap[m.id];
              return assignedFolder ? assignedFolder === folder.id : folder.id === 'default';
            });
            const isCollapsed = folder.isCollapsed;
            const isRenamingFolder = renamingFolderId === folder.id;
            const isDragOverFolder = dragOverFolderId === folder.id;

            return (
              <div 
                key={folder.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  borderRadius: '8px',
                  backgroundColor: isDragOverFolder ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: isDragOverFolder ? '1px dashed var(--theme-ui-accent-color)' : '1px solid transparent',
                  padding: '2px',
                  transition: 'all 0.2s'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  if (draggedMapId && onMoveMapToFolder) {
                    onMoveMapToFolder(draggedMapId, folder.id);
                    setDraggedMapId(null);
                  }
                }}
              >
                {/* Folder Header */}
                <div
                  className="folder-header-row"
                  onClick={() => onToggleFolderCollapse && onToggleFolderCollapse(folder.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--theme-ui-accent-color)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    borderBottom: '1px dashed var(--theme-glass-border)',
                    paddingBottom: '6px',
                    marginBottom: '4px',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1, minWidth: 0 }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <Folder size={15} />
                    
                    {isRenamingFolder ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexGrow: 1 }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameFolderValue}
                          onChange={(e) => setRenameFolderValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRenameFolder && onRenameFolder(folder.id, renameFolderValue);
                              setRenamingFolderId(null);
                            }
                          }}
                          autoFocus
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--theme-ui-accent-color)',
                            color: 'var(--theme-text-color)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => {
                            onRenameFolder && onRenameFolder(folder.id, renameFolderValue);
                            setRenamingFolderId(null);
                          }}
                          style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 2 }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingFolderId(folder.id);
                          setRenameFolderValue(folder.name);
                        }}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {folder.name}
                      </span>
                    )}

                    <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 400 }}>({folderMaps.length})</span>
                  </div>

                  {/* Folder Actions */}
                  <div 
                    className="folder-actions"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onCreateNewMap(t('untitledMap'), folder.id)}
                      title={t('newMap')}
                      style={{ background: 'none', border: 'none', color: 'var(--theme-text-color)', cursor: 'pointer', opacity: 0.6, padding: '2px' }}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setRenamingFolderId(folder.id);
                        setRenameFolderValue(folder.name);
                      }}
                      title={t('rename')}
                      style={{ background: 'none', border: 'none', color: 'var(--theme-text-color)', cursor: 'pointer', opacity: 0.6, padding: '2px' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    {folder.id !== 'default' && (
                      <button
                        onClick={() => {
                          if (window.confirm(t('deleteFolderConfirm'))) {
                            onDeleteFolder && onDeleteFolder(folder.id);
                          }
                        }}
                        title={t('delete')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, padding: '2px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Folder Maps List */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                    {folderMaps.length === 0 ? (
                      <div style={{ fontSize: '11px', color: 'var(--theme-text-color)', opacity: 0.4, fontStyle: 'italic', padding: '6px 8px' }}>
                        （尚無心智圖）
                      </div>
                    ) : (
                      folderMaps.map((map, index) => {
                        const isActive = map.id === activeMapId;
                        const isRenaming = renamingId === map.id;

                        return (
                          <div
                            key={map.id}
                            onClick={() => !isRenaming && onSwitchMap(map.id)}
                            className={`sidebar-map-item ${isActive ? 'active' : ''}`}
                            draggable={!isRenaming}
                            onDragStart={(e) => {
                              setDraggedMapId(map.id);
                              handleDragStart(e, index);
                            }}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={() => {
                              setDraggedMapId(null);
                              handleDragEnd();
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              cursor: isRenaming ? 'default' : (draggedIndex !== null ? 'grabbing' : 'pointer'),
                              transition: 'all 0.2s, border-top 0.1s, border-bottom 0.1s',
                              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                              opacity: draggedIndex === index ? 0.35 : 1,
                              borderTop: (dragOverIndex === index && draggedIndex !== null && index < draggedIndex)
                                ? '2px solid var(--theme-ui-accent-color)'
                                : (isActive ? '1px solid var(--theme-glass-border)' : '1px solid transparent'),
                              borderBottom: (dragOverIndex === index && draggedIndex !== null && index > draggedIndex)
                                ? '2px solid var(--theme-ui-accent-color)'
                                : (isActive ? '1px solid var(--theme-glass-border)' : '1px solid transparent'),
                              borderLeft: isActive ? '1px solid var(--theme-glass-border)' : '1px solid transparent',
                              borderRight: isActive ? '1px solid var(--theme-glass-border)' : '1px solid transparent'
                            }}
                          >
                            {isRenaming ? (
                              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '4px' }}>
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e, map.id)}
                                  autoFocus
                                  style={{
                                    flexGrow: 1,
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--theme-ui-accent-color)',
                                    color: 'var(--theme-text-color)',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    minWidth: 0
                                  }}
                                />
                                <button 
                                  onClick={(e) => handleSaveRename(e, map.id)}
                                  style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex', padding: 2 }}
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={handleCancelRename}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', flexGrow: 1 }}>
                                  <GripVertical 
                                    size={14} 
                                    className="drag-grip"
                                    style={{ 
                                      cursor: 'grab', 
                                      color: 'var(--theme-text-color)', 
                                      opacity: 0.15,
                                      flexShrink: 0,
                                      transition: 'opacity 0.2s'
                                    }} 
                                  />
                                  <FileText 
                                    size={14} 
                                    style={{ 
                                      color: isActive ? 'var(--theme-ui-accent-color)' : 'var(--theme-text-color)',
                                      opacity: isActive ? 1 : 0.6,
                                      flexShrink: 0
                                    }} 
                                  />
                                  <span
                                    title={map.title}
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: isActive ? 600 : 400,
                                      color: 'var(--theme-text-color)',
                                      opacity: isActive ? 1 : 0.8,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {map.title}
                                  </span>
                                </div>

                                <div className="map-item-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                  <button
                                    onClick={(e) => handleStartRename(e, map.id, map.title)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--theme-text-color)',
                                      opacity: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px'
                                    }}
                                    className="hover-action-btn"
                                    title={t('renameMap')}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteClick(e, map.id, map.title)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      opacity: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px'
                                    }}
                                    className="hover-action-btn"
                                    title={t('deleteMap')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="workspace-panel">
          <div className="workspace-heading">
            <strong>工作目錄</strong>
            <div className="workspace-actions">
              <button type="button" className="workspace-icon-button" title="重新整理" aria-label="重新整理工作目錄" disabled={!ready || syncStatus !== 'saved'} onClick={async () => {
                try {
                  const result = await window.electronAPI!.refreshWorkspace();
                  if (result.warnings.length) alert(result.warnings.join('\n'));
                  location.reload();
                } catch (error) { alert(String(error)); }
              }}><RefreshCw size={16} /></button>
              <button type="button" className="workspace-icon-button" title="切換工作目錄" aria-label="切換工作目錄" disabled={!ready || syncStatus === 'syncing'} onClick={() => void onChangeWorkspace()}>
                <Settings size={16} />
              </button>
            </div>
          </div>
          <div title={directory} className="workspace-path">{directory}</div>
          <div>{t(syncStatus === 'saved' ? 'saveTooltipSaved' : syncStatus === 'error' ? 'syncStatusError' : syncStatus === 'syncing' ? 'syncStatusSyncing' : 'syncStatusDirty')}</div>
        </div>

      </div>

      <style>{`
        .sidebar-map-item:hover {
          background-color: rgba(255, 255, 255, 0.04);
        }
        .sidebar-map-item:hover .hover-action-btn {
          opacity: 0.8 !important;
        }
        .sidebar-map-item:hover .hover-action-btn:hover {
          opacity: 1 !important;
          color: var(--theme-ui-accent-color) !important;
        }
        .sidebar-map-item .hover-action-btn {
          transition: opacity 0.15s, color 0.15s;
          opacity: 0 !important; /* Hide actions until hover */
        }
        .sidebar-map-item:hover .hover-action-btn {
          opacity: 0.6 !important;
        }
        .sidebar-map-item:hover .drag-grip {
          opacity: 0.55 !important;
        }
        .sidebar-map-item .drag-grip:hover {
          opacity: 0.95 !important;
          color: var(--theme-ui-accent-color) !important;
        }
      `}</style>
    </>
  );
};
export default MapListSidebar;
