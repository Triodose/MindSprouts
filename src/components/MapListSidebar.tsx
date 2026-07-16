import React, { useState } from 'react';
import { 
  Folder, FileText, Plus, Edit2, Trash2, 
  ChevronLeft, ChevronRight, Check, X, GripVertical
} from 'lucide-react';
import type { MindMapMetadata } from '../hooks/useMindMap';
import LogoImage from '../assets/mindsprout_logo_with_text.png';

interface MapListSidebarProps {
  mapsList: MindMapMetadata[];
  activeMapId: string;
  onSwitchMap: (id: string) => void;
  onCreateNewMap: (title: string) => void;
  onDeleteMap: (id: string) => void;
  onRenameMap: (id: string, newTitle: string) => void;
  onReorderMaps: (startIndex: number, endIndex: number) => void;
}

export const MapListSidebar: React.FC<MapListSidebarProps> = ({
  mapsList,
  activeMapId,
  onSwitchMap,
  onCreateNewMap,
  onDeleteMap,
  onRenameMap,
  onReorderMaps
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
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
    if (window.confirm(`確認要刪除心智圖「${title}」嗎？`)) {
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
              marginTop: '4px',
              textTransform: 'lowercase',
              fontStyle: 'italic'
            }}
          >
            grow your mindsprouts
          </span>
        </div>

        {/* Sidebar Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--theme-ui-accent-color)',
            marginBottom: '16px',
            borderBottom: '1px dashed var(--theme-glass-border)',
            paddingBottom: '8px'
          }}
        >
          <Folder size={16} />
          <span>我的心智圖</span>
        </div>

        {/* Create New Map Button */}
        <button
          className="btn-primary"
          onClick={() => onCreateNewMap('未命名心智圖')}
          style={{
            width: '100%',
            marginBottom: '16px',
            padding: '10px',
            gap: '6px'
          }}
        >
          <Plus size={16} />
          <span>建立新心智圖</span>
        </button>

        {/* Maps List Container */}
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginRight: '-10px',
            paddingRight: '10px'
          }}
        >
          {mapsList.map((map, index) => {
            const isActive = map.id === activeMapId;
            const isRenaming = renamingId === map.id;

            return (
              <div
                key={map.id}
                onClick={() => !isRenaming && onSwitchMap(map.id)}
                className={`sidebar-map-item ${isActive ? 'active' : ''}`}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
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

                    {/* Quick action buttons on hover (using CSS class hover interactions) */}
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
                        title="重命名"
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
                        title="刪除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
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
