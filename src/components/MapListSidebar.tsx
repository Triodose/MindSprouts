import React, { useState } from 'react';
import { 
  Folder, FileText, Plus, Edit2, Trash2, 
  ChevronLeft, ChevronRight, Check, X, GripVertical,
  CloudOff, RefreshCw, Clock, AlertCircle, Cloud, LogOut, LogIn
} from 'lucide-react';
import { FolderPlus, ChevronDown } from 'lucide-react';
import type { MindMapMetadata, FolderItem } from '../hooks/useMindMap';
import LogoImage from '../assets/mindsprout_logo_with_text.png';
import triodoseIcon from '../assets/triodose_icon.png';
import { useI18n } from '../context/I18nContext';

interface MapListSidebarProps {
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
  isGoogleDriveConfigured: boolean;
  user: any;
  syncStatus: 'saved' | 'dirty' | 'syncing' | 'error';
  onLogin: () => void;
  onLogout: () => void;
}

export const MapListSidebar: React.FC<MapListSidebarProps> = ({
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
  isGoogleDriveConfigured,
  user,
  syncStatus,
  onLogin,
  onLogout
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(true);
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
      {/* Toggle Button */}
      <button
        className="sidebar-toggle-btn glass-panel"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          left: isOpen ? '284px' : '24px',
          top: '24px',
          zIndex: 110,
          background: 'var(--theme-glass-background)',
          border: '1px solid var(--theme-glass-border)',
          color: 'var(--theme-text-color)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Sidebar Panel */}
      <div
        className="map-sidebar glass-panel"
        style={{
          position: 'fixed',
          left: '24px',
          top: '24px',
          bottom: '24px',
          width: '260px',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : 'translateX(-320px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box'
          }}
        >
          <img 
            src={LogoImage} 
            alt="MindSprouts" 
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '52px',
              objectFit: 'contain'
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              color: 'var(--theme-text-color)',
              opacity: 0.5,
              marginTop: '-6px', // Move up closer to "MindSprouts" text
              alignSelf: 'flex-start',
              marginLeft: '43px', // Align "g" with the "M" of MindSprouts
              textTransform: 'lowercase',
              fontStyle: 'italic'
            }}
          >
            grow your mindsprouts
          </span>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className="btn-primary"
            onClick={() => onCreateNewMap(t('untitledMap'))}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: '13px',
              gap: '6px',
              justifyContent: 'center'
            }}
          >
            <Plus size={15} />
            <span>{t('newMap')}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => onCreateFolder && onCreateFolder(t('untitledFolder'))}
            title={t('newFolder')}
            style={{
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--theme-glass-border)',
              color: 'var(--theme-text-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <FolderPlus size={15} />
            <span>{t('newFolder')}</span>
          </button>
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

                {/* Google Drive Auth Integration */}
        <div 
          style={{ 
            borderTop: '1px solid var(--theme-glass-border)', 
            paddingTop: '16px', 
            marginTop: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              color: 'var(--theme-ui-accent-color)', 
              marginBottom: '8px' 
            }}
          >
            {t('syncStatusTitle')}
          </div>
          <div className="auth-panel">
            {!isGoogleDriveConfigured ? (
              <div className="db-status-pill db-status-offline" style={{ alignSelf: 'start' }}>
                <CloudOff size={14} /> {t('syncStatusLocal')}
              </div>
            ) : user ? (
              <>
                <div className="user-profile" style={{ margin: 0, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <img
                      src={user.user_metadata?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'}
                      alt="Avatar"
                      className="user-avatar"
                      style={{ width: '24px', height: '24px' }}
                    />
                    <span 
                      className="user-email" 
                      title={user.email}
                      style={{ 
                        fontSize: '12px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '120px',
                        opacity: 0.8
                      }}
                    >
                      {user.email}
                    </span>
                  </div>
                  <button 
                    className="btn-secondary" 
                    onClick={onLogout} 
                    title={t('logout')}
                    style={{ 
                      padding: '4px 6px', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut size={12} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                  {syncStatus === 'syncing' && (
                    <div className="db-status-pill" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '100%', justifyContent: 'center' }}>
                      <RefreshCw size={12} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                      {t('syncStatusSyncing')}
                    </div>
                  )}
                  {syncStatus === 'dirty' && (
                    <div className="db-status-pill" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '100%', justifyContent: 'center' }}>
                      <Clock size={12} />
                      {t('syncStatusDirty')}
                    </div>
                  )}
                  {syncStatus === 'error' && (
                    <div className="db-status-pill" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '100%', justifyContent: 'center' }}>
                      <AlertCircle size={12} />
                      {t('syncStatusError')}
                    </div>
                  )}
                  {syncStatus === 'saved' && (
                    <div className="db-status-pill db-status-online" style={{ width: '100%', justifyContent: 'center' }}>
                      <Cloud size={14} /> {t('syncStatusConnected')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '6px', lineHeight: '1.4' }}>
                  {t('syncPrompt')}
                </div>
                <button 
                  className="btn-primary" 
                  onClick={onLogin}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <LogIn size={14} /> {t('connectDrive')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Studio Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '16px',
            opacity: 0.45,
            transition: 'opacity 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
          onClick={() => window.open('https://www.triodose.com', '_blank')}
        >
          <img 
            src={triodoseIcon} 
            alt="Triodose Studio" 
            style={{ height: '16px', width: '16px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--theme-text-color)' }}>
            Powered by Triodose Digital
          </span>
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
