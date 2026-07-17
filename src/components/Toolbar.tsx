import React, { useRef } from 'react';
import { 
  Plus, GitBranch, Trash2, Undo2, Redo2, 
  ZoomIn, ZoomOut, Maximize, Download, 
  Upload, HelpCircle, FileText, Image as ImageIcon,
  List, Map, Link2, Sun, Moon, StickyNote, Save, RefreshCw, Globe
} from 'lucide-react';
import type { MindMapNode } from '../types/mindmap';
import * as exportUtils from '../utils/exportUtils';
import { useI18n } from '../context/I18nContext';
import type { Language } from '../context/I18nContext';

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
  const { t, language, setLanguage } = useI18n();
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
            alert(t('invalidFormat'));
          }
        } else if (file.name.endsWith('.md')) {
          const parsedTree = exportUtils.parseMarkdownToTree(text);
          if (parsedTree) {
            onImportTree(parsedTree);
          } else {
            alert(t('invalidFormat'));
          }
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert(t('invalidFormat'));
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleExportPng = () => {
    const treeContainer = document.querySelector('.tree-container') as HTMLElement;
    if (treeContainer) {
      exportUtils.exportToPng(treeContainer, tree.text, t('exportImageError'));
    }
  };

  return (
    <div className="toolbar-container glass-panel">
      {/* 1. View Mode Toggles */}
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${!isOutlinerMode ? 'active' : ''}`}
          onClick={() => onToggleOutlinerMode(false)}
          data-tooltip={t('mindmapMode')}
        >
          <Map size={18} />
        </button>
        <button
          className={`toolbar-button ${isOutlinerMode ? 'active' : ''}`}
          onClick={() => onToggleOutlinerMode(true)}
          data-tooltip={t('outlineMode')}
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
          data-tooltip={t('addChild')}
        >
          <Plus size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!selectedId || selectedId === 'root'}
          onClick={() => selectedId && onAddSibling(selectedId)}
          data-tooltip={t('addSibling')}
        >
          <GitBranch size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!selectedId || selectedId === 'root'}
          onClick={() => selectedId && onDeleteSelected(selectedId)}
          data-tooltip={t('deleteNode')}
        >
          <Trash2 size={18} />
        </button>
        {connectingSourceId ? (
          <button
            className="toolbar-button active"
            onClick={() => onCancelConnection?.()}
            data-tooltip={t('cancelConnection')}
          >
            <Link2 size={18} style={{ transform: 'rotate(-45deg)' }} />
          </button>
        ) : (
          <button
            className="toolbar-button"
            disabled={!selectedId}
            onClick={() => selectedId && onStartConnection?.(selectedId)}
            data-tooltip={t('connectNodes')}
          >
            <Link2 size={18} />
          </button>
        )}
        <button
          className="toolbar-button toolbar-note-btn"
          disabled={!selectedId}
          onClick={onAddNoteClick}
          data-tooltip={t('editNote')}
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
          data-tooltip={t('undo')}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="toolbar-button"
          disabled={!canRedo}
          onClick={onRedo}
          data-tooltip={t('redo')}
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
          data-tooltip={isOutlinerMode ? t('mindmapModeOnly') : t('zoomIn')}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={onZoomOut}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? t('mindmapModeOnly') : t('zoomOut')}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={onCenterCanvas}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? t('mindmapModeOnly') : t('centerCanvas')}
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
              ? t('saveTooltipLocal')
              : syncStatus === 'dirty'
              ? t('saveTooltipDirty')
              : syncStatus === 'syncing'
              ? t('saveTooltipSyncing')
              : syncStatus === 'error'
              ? t('saveTooltipError')
              : t('saveTooltipSaved')
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
          data-tooltip={t('importFile')}
        >
          <Download size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => exportUtils.exportToJson(tree, tree.text)}
          data-tooltip={t('exportJson')}
        >
          <Upload size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => exportUtils.exportToMarkdown(tree, tree.text)}
          data-tooltip={t('exportMarkdown')}
        >
          <FileText size={18} />
        </button>
        <button
          className="toolbar-button"
          onClick={handleExportPng}
          disabled={isOutlinerMode}
          data-tooltip={isOutlinerMode ? t('mindmapModeOnly') : t('exportPng')}
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
          data-tooltip={uiTheme === 'light' ? t('themeLight') : t('themeDark')}
        >
          {uiTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Language Selector */}
      <div className="toolbar-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Globe size={18} style={{ opacity: 0.8 }} />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--theme-text-color)',
            fontSize: '13px',
            fontWeight: 500,
            outline: 'none',
            cursor: 'pointer',
            padding: '4px 2px',
            borderRadius: '4px'
          }}
          title={t('selectLanguage')}
        >
          <option value="zh" style={{ background: 'var(--theme-bg-color)', color: 'var(--theme-text-color)' }}>{t('langZh')}</option>
          <option value="en" style={{ background: 'var(--theme-bg-color)', color: 'var(--theme-text-color)' }}>{t('langEn')}</option>
          <option value="ja" style={{ background: 'var(--theme-bg-color)', color: 'var(--theme-text-color)' }}>{t('langJa')}</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      {/* Help shortcuts */}
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onOpenShortcuts}
          data-tooltip={t('shortcutsHelp')}
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
};
export default Toolbar;
