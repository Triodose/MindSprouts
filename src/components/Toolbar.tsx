import React, { useRef, useEffect } from 'react';
import {
  Plus, GitBranch, Trash2, Undo2, Redo2, Copy, ClipboardPaste,
  ZoomIn, ZoomOut, Maximize, Download,
  Upload, HelpCircle, FileText, Image as ImageIcon,
  Link2, Sun, Moon, StickyNote, Save, RefreshCw, Globe, ChevronDown, PanelRight, FolderOpen
} from 'lucide-react';
import type { MindMapNode } from '../types/mindmap';
import * as exportUtils from '../utils/exportUtils';
import { useI18n } from '../context/I18nContext';
import type { Language } from '../context/I18nContext';

interface ToolbarProps {
  navigation: React.ReactNode;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  directory: string;
  onChangeWorkspace: () => Promise<void>;
  zoom: number;
  selectedId: string | null;
  onCopy: () => void;
  onPaste: () => void;
  canCopy: boolean;
  canPaste: boolean;
  canUndo: boolean;
  canRedo: boolean;
  tree: MindMapNode;
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
  navigation, inspectorOpen, onToggleInspector, directory, onChangeWorkspace,
  zoom,
  selectedId,
  canUndo,
  onCopy, onPaste, canCopy, canPaste,
  canRedo,
  tree,
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

  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menuRef.current?.open) { menuRef.current.open = false; menuRef.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  const menuAction = (action: () => void) => { if (menuRef.current) menuRef.current.open = false; action(); };
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
          if (parsed.version !== undefined && parsed.version !== 1) throw new Error('Unsupported document version');
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

  return <>
    <div className="toolbar-container focus-toolbar" role="toolbar" aria-label={t('editorTools')}>
      <div className="header-map-tools glass-panel">{navigation}</div>
      <div className="header-editor-tools glass-panel">
      <div className="toolbar-group">
        <button className="toolbar-button" disabled={!canUndo} onClick={onUndo} aria-label={t('undo')} data-tooltip={t('undo')}><Undo2 size={18}/></button>
        <button className="toolbar-button" disabled={!canRedo} onClick={onRedo} aria-label={t('redo')} data-tooltip={t('redo')}><Redo2 size={18}/></button>
      </div><div className="toolbar-divider"/>
      <button className="focus-add-button" disabled={!selectedId} onClick={()=>selectedId&&onAddChild(selectedId)} aria-label={t('addChild')}><Plus size={17}/><span>{t('addTopic')}</span></button>
      <button className="toolbar-button header-secondary-tool" disabled={!selectedId||selectedId==='root'} onClick={()=>selectedId&&onAddSibling(selectedId)} aria-label={t('addSibling')} data-tooltip={t('addSibling')}><GitBranch size={17}/></button>
      <button className="toolbar-button header-secondary-tool" disabled={!canCopy} onClick={onCopy} aria-label={t('copyBranch')} data-tooltip={t('copyBranch')}><Copy size={17}/></button>
      <button className="toolbar-button header-secondary-tool" disabled={!canPaste} onClick={onPaste} aria-label={t('pasteBranch')} data-tooltip={t('pasteBranch')}><ClipboardPaste size={17}/></button>
      <button className="toolbar-button header-secondary-tool" disabled={!selectedId||selectedId==='root'} onClick={()=>selectedId&&onDeleteSelected(selectedId)} aria-label={t('deleteNode')} data-tooltip={t('deleteNode')}><Trash2 size={17}/></button>
      <div className="toolbar-divider"/>
      <button className={`toolbar-button ${connectingSourceId ? 'active' : ''}`} disabled={!selectedId && !connectingSourceId} aria-pressed={!!connectingSourceId} aria-label={t(connectingSourceId ? 'cancelConnection' : 'connectNodes')} data-tooltip={t(connectingSourceId ? 'cancelConnection' : 'connectNodes')} onClick={() => connectingSourceId ? onCancelConnection?.() : selectedId && onStartConnection?.(selectedId)}><Link2 size={17}/></button>
      <button className="toolbar-button toolbar-note-btn" disabled={!selectedId} aria-label={t('editNote')} data-tooltip={t('editNote')} onClick={() => onAddNoteClick?.()}><StickyNote size={17}/></button>
      <div className="toolbar-divider"/>
      </div>
      <div className="header-utility-tools glass-panel">
      <details className="focus-file-menu" ref={menuRef}>
        <summary aria-label={t('moreTools')}>{t('fileMenu')}<ChevronDown size={14}/></summary>
        <div className="focus-menu-content">
          <button disabled={!canUndo} onClick={()=>menuAction(onUndo)}><Undo2 size={16}/>{t('undo')}</button>
          <button disabled={!canRedo} onClick={()=>menuAction(onRedo)}><Redo2 size={16}/>{t('redo')}</button>
          <button disabled={!selectedId && !connectingSourceId} onClick={()=>menuAction(()=>connectingSourceId ? onCancelConnection?.() : selectedId && onStartConnection?.(selectedId))}><Link2 size={16}/>{t(connectingSourceId ? 'cancelConnection' : 'connectNodes')}</button>
          <button disabled={!selectedId} onClick={()=>menuAction(()=>onAddNoteClick?.())}><StickyNote size={16}/>{t('editNote')}</button>
          <button disabled={!selectedId||selectedId==='root'} onClick={()=>menuAction(()=>selectedId&&onAddSibling(selectedId))}><GitBranch size={16}/>{t('addSibling')}</button>
          <button disabled={!canCopy} onClick={()=>menuAction(onCopy)}><Copy size={16}/>{t('copyBranch')}</button>
          <button disabled={!canPaste} onClick={()=>menuAction(onPaste)}><ClipboardPaste size={16}/>{t('pasteBranch')}</button>
          <button disabled={!selectedId||selectedId==='root'} onClick={()=>menuAction(()=>selectedId&&onDeleteSelected(selectedId))}><Trash2 size={16}/>{t('deleteNode')}</button>
          <hr/>
          <button disabled={syncStatus!=='saved'} onClick={()=>menuAction(async()=>{ try { const result=await window.electronAPI!.refreshWorkspace(); if(result.warnings.length) alert(result.warnings.join('\n')); location.reload(); } catch(error) { alert(String(error)); } })}><RefreshCw size={16}/>重新整理工作區</button>
          <button aria-label="切換工作目錄" title={directory} disabled={syncStatus==='syncing'} onClick={()=>menuAction(()=>void onChangeWorkspace())}><FolderOpen size={16}/>切換工作區</button>
          <button disabled={!isConnected||syncStatus==='syncing'} onClick={()=>menuAction(onSave)}><Save size={16}/>{t('saveNow')}</button>
          <button onClick={()=>menuAction(handleImportClick)}><Download size={16}/>{t('importFile')}</button>
          <button onClick={()=>menuAction(()=>exportUtils.exportToJson(tree, tree.children?.[0]?.text||tree.text))}><Upload size={16}/>{t('exportJson')}</button>
          <button onClick={()=>menuAction(()=>exportUtils.exportToMarkdown(tree,tree.children?.[0]?.text||tree.text))}><FileText size={16}/>{t('exportMarkdown')}</button>
          <button onClick={()=>menuAction(handleExportPng)}><ImageIcon size={16}/>{t('exportPng')}</button>
          <hr/>
          <button onClick={()=>menuAction(onToggleUiTheme)}>{uiTheme==='light'?<Moon size={16}/>:<Sun size={16}/>} {t(uiTheme==='light'?'themeLight':'themeDark')}</button>
          <button onClick={()=>menuAction(onOpenShortcuts)}><HelpCircle size={16}/>{t('shortcutsHelp')}</button>
          <label><Globe size={16}/><select aria-label={t('selectLanguage')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="zh">{t('langZh')}</option><option value="en">{t('langEn')}</option><option value="ja">{t('langJa')}</option></select></label>
        </div>
      </details>
      <button type="button" className="toolbar-button" aria-label={t('inspectorToggle')} title={t('inspectorToggle')} aria-expanded={inspectorOpen} aria-pressed={inspectorOpen} onClick={onToggleInspector}><PanelRight size={18}/></button>
      <input ref={fileInputRef} type="file" accept=".json,.md,.sprout" onChange={handleFileChange} style={{display:'none'}}/>
      </div>
    </div>
    {connectingSourceId&&<button className="focus-connection-status" onClick={onCancelConnection}><Link2 size={15}/>{t('cancelConnection')}</button>}
    <div className="focus-zoom-dock glass-panel" role="toolbar" aria-label={t('canvasTools')}>
      <button className="toolbar-button" onClick={onZoomOut} aria-label={t('zoomOut')}><ZoomOut size={16}/></button>
      <span>{Math.round(zoom*100)}%</span><button className="toolbar-button" onClick={onZoomIn} aria-label={t('zoomIn')}><ZoomIn size={16}/></button><i/>
      <button className="toolbar-button" onClick={onCenterCanvas} aria-label={t('centerCanvas')}><Maximize size={16}/></button>
    </div>
    <div className={`focus-save-status status-${syncStatus}`} role="status">{syncStatus==='syncing'?<RefreshCw size={12} className="spin"/>:<i/>}{t(syncStatus==='saved'?'saveTooltipSaved':syncStatus==='error'?'saveTooltipError':syncStatus==='syncing'?'saveTooltipSyncing':'saveTooltipDirty')}</div>
  </>;
};
export default Toolbar;
