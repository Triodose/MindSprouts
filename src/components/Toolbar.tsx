import React, { useRef } from 'react';
import { 
  Plus, GitBranch, Trash2, Undo2, Redo2, 
  ZoomIn, ZoomOut, Maximize, Download, 
  Upload, HelpCircle, FileText, Image as ImageIcon,
  List, Map, Link2, Sun, Moon, StickyNote, Save, RefreshCw
} from 'lucide-react';
import type { MindMapNode } from '../types/mindmap';
import * as exportUtils from '../utils/exportUtils';

interface ToolbarProps {
  selectedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  tree: MindMapNode;
  isOutlinerMode: boolean;
  onToggleOutlinerMode: (isOutliner: boolean) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onDeleteSelected: (targetId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterCanvas: () => void;
  onImportTree: (newTree: MindMapNode) => void;
  onOpenShortcuts: () => void;
  connectingSourceId?: string | null;
  onStartConnection?: (nodeId: string) => void;
  onCancelConnection?: () => void;
  onAddNoteClick?: () => void;
  uiTheme: 'light' | 'dark';
  onToggleUiTheme: () => void;
  syncStatus: 'saved' | 'dirty' | 'syncing' | 'error';
  onSave: () => void;
  isConnected: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedId,
  canUndo,
  canRedo,
  tree,
  isOutlinerMode,
  onToggleOutlinerMode,
  onAddChild,
  onAddSibling,
  onDeleteSelected,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onCenterCanvas,
  onImportTree,
  onOpenShortcuts,
  connectingSourceId = null,
  onStartConnection,
  onCancelConnection,
  onAddNoteClick,
  uiTheme,
  onToggleUiTheme,
  syncStatus,
  onSave,
  isConnected
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        if (file.name.endsWith('.json') || file.name.endsWith('.sprout')) {
          const parsed = JSON.parse(text);
          let treeData = parsed;
          if (parsed && typeof parsed === 'object' && parsed.content) {
            treeData = parsed.content;
          }
          if (treeData && typeof treeData === 'object' && treeData.id && treeData.text) {
            onImportTree(treeData);
          } else {
            alert('無效的心智圖檔案格式！');
          }
        } else if (file.name.endsWith('.md')) {
          const parsedTree = exportUtils.parseMarkdownToTree(text);
          if (parsedTree) {
            onImportTree(parsedTree);
          } else {
            alert('解析 Markdown 檔案失敗，請確認檔案格式是否為縮排列表！');
          }
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert('解析檔案失敗，格式不正確。');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleExportPng = () => {
    const treeContainer = document.querySelector('.tree-container') as HTMLElement;
    if (treeContainer) {
      exportUtils.exportToPng(treeContainer, tree.text);
    }
  };

  return (
    <div className="toolbar-container glass-panel">
      {/* 1. View Mode Toggles */}
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${!isOutlinerMode ? 'active' : ''}`}
          onClick={() => onToggleOutlinerMode(false)}
          data-tooltip="心智圖模式"
        >
          <Map size={18} />
        </button>
        <button
          className={`toolbar-button ${isOutlinerMode ? 'active' : ''}`}
          onClick={() => onToggleOutlinerMode(true)}
          data-tooltip="大綱編輯模式"
        >
          <List size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Node operations */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          disabled={!selectedId}
          onClick={() => selectedId && onAddChild(selectedId)}
          data-tooltip="新增子節點 (Tab)"
        >
          <Plus size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!selectedId || selectedId === 'root'}
          onClick={() => selectedId && onAddSibling(selectedId)}
          data-tooltip="新增兄弟節點 (Enter)"
        >
          <GitBranch size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!selectedId || selectedId === 'root'}
          onClick={() => selectedId && onDeleteSelected(selectedId)}
          data-tooltip="刪除節點 (Del)"
        >
          <Trash2 size={18} />
        </button>
        {connectingSourceId ? (
          <button
            className="toolbar-button active"
            onClick={() => onCancelConnection?.()}
            data-tooltip="取消建立關聯線"
          >
            <Link2 size={18} style={{ transform: 'rotate(-45deg)' }} />
          </button>
        ) : (
          <button
            className="toolbar-button"
            disabled={!selectedId}
            onClick={() => selectedId && onStartConnection?.(selectedId)}
            data-tooltip="建立關聯線 🔗"
          >
            <Link2 size={18} />
          </button>
        )}
        <button
          className="toolbar-button toolbar-note-btn"
          disabled={!selectedId}
          onClick={onAddNoteClick}
          data-tooltip="編輯備註 📝"
        >
          <StickyNote size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* History operations */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          disabled={!canUndo}
          onClick={onUndo}
          data-tooltip="復原 (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!canRedo}
          onClick={onRedo}
          data-tooltip="重做 (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Canvas operations */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onZoomIn}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? "心智圖模式下可用" : "放大"}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={onZoomOut}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? "心智圖模式下可用" : "縮小"}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={onCenterCanvas}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? "心智圖模式下可用" : "置中畫布"}
        >
          <Maximize size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* File import / export */}
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${syncStatus === 'dirty' ? 'dirty-btn' : ''}`}
          onClick={onSave}
          disabled={!isConnected || syncStatus === 'syncing'}
          data-tooltip={
            !isConnected
              ? "本地儲存模式 (自動儲存) 💾"
              : syncStatus === 'dirty'
              ? "有未同步的變更，點擊儲存並同步至雲端硬碟 💾"
              : syncStatus === 'syncing'
              ? "雲端同步中... ⏳"
              : syncStatus === 'error'
              ? "同步失敗，點擊重試 ❌"
              : "已同步至雲端硬碟 🟢"
          }
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw size={18} className="spin" style={{ animation: 'spin 1.5s linear infinite', color: '#3b82f6' }} />
          ) : (
            <Save
              size={18}
              style={{
                color: !isConnected
                  ? 'var(--text-secondary)'
                  : syncStatus === 'dirty'
                  ? '#f59e0b'
                  : syncStatus === 'error'
                  ? '#ef4444'
                  : '#22c55e'
              }}
            />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.md,.sprout"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          className="toolbar-button"
          onClick={handleImportClick}
          data-tooltip="匯入 (JSON / Markdown)"
        >
          <Download size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => exportUtils.exportToJson(tree, tree.text)}
          data-tooltip="匯出 JSON"
        >
          <Upload size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => exportUtils.exportToMarkdown(tree, tree.text)}
          data-tooltip="匯出 Markdown"
        >
          <FileText size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={handleExportPng}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? "心智圖模式下可用" : "匯出圖片 (PNG)"}
        >
          <ImageIcon size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* UI Theme Toggle */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onToggleUiTheme}
          data-tooltip={uiTheme === 'light' ? '切換為深色介面' : '切換為淺色介面'}
        >
          {uiTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Help shortcuts */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onOpenShortcuts}
          data-tooltip="快速鍵說明"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
};
export default Toolbar;
