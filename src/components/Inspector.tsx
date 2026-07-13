import React, { useState, useEffect } from 'react';
import type { MindMapNode, MindMapTheme } from '../types/mindmap';
import { THEMES } from '../utils/themes';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { findParent } from '../utils/treeUtils';

interface InspectorProps {
  selectedId: string | null;
  selectedNode: MindMapNode | null;
  tree: MindMapNode;
  theme: MindMapTheme;
  user: any;
  isSyncing: boolean;
  isSupabaseConfigured: boolean;
  isAutoLayout: boolean;
  onToggleAutoLayout: (active: boolean) => void;
  onUpdateStyle: (id: string, style: Partial<MindMapNode['style']>) => void;
  onApplyStyleToLevel: (id: string, style: Partial<MindMapNode['style']>) => void;
  onUpdateData: (id: string, data: Partial<MindMapNode>) => void;
  onChangeTheme: (theme: MindMapTheme) => void;
  onLogin: () => void;
  onLogout: () => void;
  onAddSummary?: (startNodeId: string, endNodeId: string) => void;
  onUpdateSummaryRange?: (summaryId: string, startNodeId: string, endNodeId: string) => void;
  onDeleteSummary?: (summaryId: string) => void;
}


const PRES_BOUNDARY_COLORS = [
  { name: '靛藍 (Indigo)', fill: 'rgba(99, 102, 241, 0.05)', border: '#6366f1' },
  { name: '玫瑰紅 (Rose)', fill: 'rgba(244, 63, 94, 0.05)', border: '#f43f5e' },
  { name: '翡翠綠 (Emerald)', fill: 'rgba(16, 185, 129, 0.05)', border: '#10b981' },
  { name: '琥珀黃 (Amber)', fill: 'rgba(245, 158, 11, 0.05)', border: '#f59e0b' },
  { name: '紫羅蘭 (Violet)', fill: 'rgba(139, 92, 246, 0.05)', border: '#8b5cf6' },
  { name: '石板灰 (Slate)', fill: 'rgba(148, 163, 184, 0.06)', border: '#94a3b8' }
];

const getNodeSide = (rootNode: MindMapNode, targetId: string): 'left' | 'right' => {
  // 1. Find the top-level tree root node that contains targetId
  let topLevelRoot: MindMapNode | null = null;
  if (rootNode.id === 'virtual-root') {
    for (const child of rootNode.children) {
      const containsTarget = (n: MindMapNode): boolean => {
        if (n.id === targetId) return true;
        return n.children?.some(containsTarget) || false;
      };
      if (containsTarget(child)) {
        topLevelRoot = child;
        break;
      }
    }
  } else {
    topLevelRoot = rootNode;
  }

  if (!topLevelRoot) return 'right';

  // 2. Check structure of this topLevelRoot
  const rootStructure = topLevelRoot.style?.structure || 'logic';
  if (rootStructure === 'logic-left') return 'left';
  if (rootStructure === 'logic') return 'right';

  // 3. For mindmap layouts, check which side of center the node lies
  const leftChildren = topLevelRoot.children.filter((_, idx) => idx % 2 === 0);
  const containsTarget = (n: MindMapNode): boolean => {
    if (n.id === targetId) return true;
    return n.children?.some(containsTarget) || false;
  };
  const isLeft = leftChildren.some(containsTarget);
  return isLeft ? 'left' : 'right';
};

export const Inspector: React.FC<InspectorProps> = ({
  selectedId,
  selectedNode,
  tree,
  theme,
  user,
  isSyncing,
  isSupabaseConfigured,
  isAutoLayout,
  onToggleAutoLayout,
  onUpdateStyle,
  onApplyStyleToLevel,
  onUpdateData,
  onChangeTheme,
  onLogin,
  onLogout,
  onAddSummary,
  onUpdateSummaryRange,
  onDeleteSummary
}) => {
  const rootNode = tree.children.find((c) => c.id === 'root');
  const isTimelineMode = rootNode?.style?.structure === 'timeline';

  // Dynamically calculate preset colors based on the active mind map theme
  const presetColors = React.useMemo(() => {
    const list = new Set<string>();
    
    // Add accent color
    if (theme.accentColor) list.add(theme.accentColor.toLowerCase());
    
    // Add all branch colors
    if (theme.branchColors) {
      theme.branchColors.forEach(c => list.add(c.toLowerCase()));
    }
    
    // Add root colors
    if (theme.rootBorder) list.add(theme.rootBorder.toLowerCase());
    if (theme.rootBackground) list.add(theme.rootBackground.toLowerCase());
    
    // Add node default colors
    if (theme.nodeDefaultBorder) list.add(theme.nodeDefaultBorder.toLowerCase());
    if (theme.nodeDefaultBackground) list.add(theme.nodeDefaultBackground.toLowerCase());
    
    // Add line/relationship colors
    if (theme.lineColor) list.add(theme.lineColor.toLowerCase());
    if (theme.relLineActiveColor) list.add(theme.relLineActiveColor.toLowerCase());

    // Fill in standard colors (like white, dark grey, black) to ensure they have enough options (10 slots)
    const fallbackColors = [
      '#ffffff',
      '#f8fafc',
      '#e2e8f0',
      '#94a3b8',
      '#475569',
      '#1e293b',
      '#0f172a'
    ];

    for (const color of fallbackColors) {
      if (list.size >= 10) break;
      list.add(color.toLowerCase());
    }

    return Array.from(list).slice(0, 10);
  }, [theme]);

  const [activePicker, setActivePicker] = useState<'text' | 'bg' | 'border' | null>(null);

  // Close color picker when selecting another node
  useEffect(() => {
    setActivePicker(null);
  }, [selectedId]);

  const handleShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { shape: e.target.value as any });
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { structure: e.target.value as any });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { fontSize: e.target.value });
  };

  const handleFontWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { fontWeight: e.target.value });
  };

  const handleColorSelect = (color: string | undefined) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { color });
  };

  const handleBgSelect = (backgroundColor: string | undefined) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { backgroundColor });
  };

  const handleBorderSelect = (borderColor: string | undefined) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { borderColor });
  };

  const handleBorderStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { borderStyle: e.target.value as any });
  };

  const renderColorPickerDropdown = (
    type: 'text' | 'bg' | 'border',
    value: string | undefined,
    onChange: (val: string | undefined) => void
  ) => {
    const displayValue = value || '';
    
    return (
      <div 
        className="glass-panel" 
        style={{
          position: 'absolute',
          top: '36px',
          right: '0',
          width: '200px',
          padding: '12px',
          borderRadius: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'var(--theme-panel-shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>主題配色</span>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '6px'
          }}
        >
          {presetColors.map((c) => (
            <div
              key={`${type}-preset-${c}`}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: c,
                cursor: 'pointer',
                border: value?.toLowerCase() === c.toLowerCase() ? '2px solid var(--theme-ui-accent-color)' : '1px solid var(--theme-glass-border)',
                boxSizing: 'border-box',
                transition: 'transform 0.1s'
              }}
              onClick={() => {
                onChange(c);
                setActivePicker(null);
              }}
              className="color-swatch-circle"
              title={c}
            />
          ))}
        </div>

        <div style={{ borderTop: '1px dashed var(--theme-glass-border)', margin: '4px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>自訂顏色</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="color" 
              value={displayValue.startsWith('#') ? displayValue : '#ffffff'} 
              onChange={(e) => onChange(e.target.value)}
              style={{ 
                width: '28px', 
                height: '24px', 
                padding: 0, 
                border: 'none', 
                background: 'transparent', 
                cursor: 'pointer' 
              }}
            />
            <input
              type="text"
              value={displayValue}
              onChange={(e) => onChange(e.target.value || undefined)}
              placeholder="無 / #hex"
              className="inspector-input"
              style={{ 
                flexGrow: 1, 
                padding: '2px 6px', 
                fontSize: '11px',
                width: '100%'
              }}
            />
          </div>
        </div>

        {type !== 'text' && (
          <button
            onClick={() => {
              onChange(undefined);
              setActivePicker(null);
            }}
            className="btn-primary"
            style={{
              padding: '6px',
              fontSize: '11px',
              marginTop: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            設為透明 / 預設
          </button>
        )}
      </div>
    );
  };

  // Automatically normalize left/right structure styles based on hierarchy side
  React.useEffect(() => {
    if (selectedNode && selectedId && selectedId !== 'root') {
      const side = getNodeSide(tree, selectedId);
      const struct = selectedNode.style?.structure || 'logic';
      if (side === 'left' && struct === 'logic') {
        onUpdateStyle(selectedId, { structure: 'logic-left' });
      } else if (side === 'right' && struct === 'logic-left') {
        onUpdateStyle(selectedId, { structure: 'logic' });
      }
    }
  }, [selectedId, selectedNode, tree, onUpdateStyle]);

  const currentShape = selectedNode?.style?.shape || 'rounded';
  const currentBorderStyle = selectedNode?.style?.borderStyle || 'solid';
  const currentStructure = selectedNode?.style?.structure || 'logic';
  const selectedNodeSide = selectedNode && selectedId ? getNodeSide(tree, selectedId) : 'right';
  const currentFontSize = selectedNode?.style?.fontSize || (selectedId === 'root' ? '18px' : '14px');
  const currentFontWeight = selectedNode?.style?.fontWeight || (selectedId === 'root' ? '700' : '500');
  const currentColor = selectedNode?.style?.color || '';
  const currentBg = selectedNode?.style?.backgroundColor || '';
  const currentBorderColor = selectedNode?.style?.borderColor || '';

  return (
    <div className="inspector-panel glass-panel">
      {activePicker && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
          onClick={() => setActivePicker(null)} 
        />
      )}
      {/* 1. Workspace Theme */}
      <div className="inspector-section">
        <div className="inspector-title">心智圖配置</div>
        
        <div className="inspector-row">
          <span className="inspector-label">主題配色</span>
          <select
            className="inspector-select"
            value={theme.id}
            onChange={(e) => {
              const selected = THEMES.find((t) => t.id === e.target.value);
              if (selected) onChangeTheme(selected);
            }}
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inspector-row" style={{ marginTop: '8px' }}>
          <span className="inspector-label">地圖排版結構</span>
          <select
            className="inspector-select"
            value={tree.children.find((c) => c.id === 'root')?.style?.structure || 'logic'}
            onChange={(e) => onUpdateStyle('root', { structure: e.target.value as any })}
          >
            <option value="mindmap">經典心智圖 (Mind Map)</option>
            <option value="logic">右側邏輯圖 (Logic Right)</option>
            <option value="logic-left">左側邏輯圖 (Logic Left)</option>
            <option value="org">組織結構圖 (Org Chart)</option>
            <option value="tree">樹狀圖 (Tree Chart)</option>
            <option value="brace">括號圖 (Brace Map)</option>
            <option value="timeline">時間軸 (Timeline)</option>
            <option value="fishbone">魚骨圖 (Fishbone)</option>
          </select>
        </div>

        <div className="inspector-row" style={{ marginTop: '8px' }}>
          <span className="inspector-label">自動排列對齊</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isAutoLayout}
              onChange={(e) => onToggleAutoLayout(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* 2. Selected Node Styles */}
      <div className="inspector-section" style={{ flexGrow: 1 }}>
        <div className="inspector-title">節點樣式設定</div>
        {selectedNode ? (
          <>
            <div className="inspector-row">
              <span className="inspector-label">外觀形狀</span>
              <select
                className="inspector-select"
                value={currentShape}
                onChange={handleShapeChange}
              >
                <option value="rounded">圓角框 (Rounded)</option>
                <option value="rectangle">直角框 (Rectangle)</option>
                <option value="underlined">下底線 (Underline)</option>
                <option value="diamond">菱形 (Diamond)</option>
                <option value="circle">圓形 (Circle)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">外框線條</span>
              <select
                className="inspector-select"
                value={currentBorderStyle}
                onChange={handleBorderStyleChange}
              >
                <option value="solid">實線 (Solid)</option>
                <option value="dashed">短虛線 (Dashed)</option>
                <option value="long-dashed">長虛線 (Long Dashed)</option>
                <option value="dotted">點線 (Dotted)</option>
              </select>
            </div>

            <div className="inspector-row" style={{ position: 'relative' }}>
              <span className="inspector-label">外框顏色</span>
              <div 
                className="inspector-select" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  justifyContent: 'space-between',
                  userSelect: 'none'
                }}
                onClick={() => setActivePicker(activePicker === 'border' ? null : 'border')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '4px', 
                      backgroundColor: currentBorderColor || 'transparent',
                      border: '1px solid var(--theme-glass-border)',
                      position: 'relative',
                      overflow: 'hidden'
                    }} 
                  >
                    {!currentBorderColor && (
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#ef4444',
                        transform: 'rotate(-45deg) translate(-1px, 5px)',
                        transformOrigin: 'center'
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: '12px' }}>{currentBorderColor || '預設'}</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </div>
              {activePicker === 'border' && renderColorPickerDropdown('border', currentBorderColor, handleBorderSelect)}
            </div>

            {!isTimelineMode && (
              <div className="inspector-row">
                <span className="inspector-label">分支結構</span>
                <select
                  className="inspector-select"
                  value={currentStructure}
                  onChange={handleStructureChange}
                >
                  {selectedNodeSide === 'left' ? (
                    <option value="logic-left">左側邏輯圖 (Logic Left)</option>
                  ) : (
                    <option value="logic">右側邏輯圖 (Logic Right)</option>
                  )}
                  <option value="org">組織結構圖 (Org Chart)</option>
                  <option value="tree">樹狀圖 (Tree Chart)</option>
                  <option value="brace">括號圖 (Brace Map)</option>
                  <option value="timeline">時間軸 (Timeline)</option>
                  <option value="fishbone">魚骨圖 (Fishbone)</option>
                </select>
              </div>
            )}

            <div className="inspector-row">
              <span className="inspector-label">文字大小</span>
              <select
                className="inspector-select"
                value={currentFontSize}
                onChange={handleFontSizeChange}
              >
                <option value="12px">小 (12px)</option>
                <option value="14px">中 (14px)</option>
                <option value="16px">大 (16px)</option>
                <option value="18px">特大 (18px)</option>
                <option value="22px">超大 (22px)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">文字粗細</span>
              <select
                className="inspector-select"
                value={currentFontWeight}
                onChange={handleFontWeightChange}
              >
                <option value="300">細 (Light)</option>
                <option value="500">中 (Regular)</option>
                <option value="700">粗 (Bold)</option>
              </select>
            </div>

            <div className="inspector-row" style={{ position: 'relative' }}>
              <span className="inspector-label">文字顏色</span>
              <div 
                className="inspector-select" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  justifyContent: 'space-between',
                  userSelect: 'none'
                }}
                onClick={() => setActivePicker(activePicker === 'text' ? null : 'text')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '4px', 
                      backgroundColor: currentColor || 'currentColor',
                      border: '1px solid var(--theme-glass-border)'
                    }} 
                  />
                  <span style={{ fontSize: '12px' }}>{currentColor || '預設'}</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </div>
              {activePicker === 'text' && renderColorPickerDropdown('text', currentColor, handleColorSelect)}
            </div>

            {currentShape !== 'underlined' && (
              <div className="inspector-row" style={{ position: 'relative' }}>
                <span className="inspector-label">背景填滿</span>
                <div 
                  className="inspector-select" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer',
                    justifyContent: 'space-between',
                    userSelect: 'none'
                  }}
                  onClick={() => setActivePicker(activePicker === 'bg' ? null : 'bg')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '4px', 
                        backgroundColor: currentBg || 'transparent',
                        border: '1px solid var(--theme-glass-border)',
                        position: 'relative',
                        overflow: 'hidden'
                      }} 
                    >
                      {!currentBg && (
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '2px',
                          backgroundColor: '#ef4444',
                          transform: 'rotate(-45deg) translate(-1px, 5px)',
                          transformOrigin: 'center'
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: '12px' }}>{currentBg || '透明'}</span>
                  </div>
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
                </div>
                {activePicker === 'bg' && renderColorPickerDropdown('bg', currentBg, handleBgSelect)}
              </div>
            )}



            <div style={{ marginTop: '18px' }}>
              <button
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--theme-ui-accent-color)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s'
                }}
                onClick={() => {
                  if (!selectedNode || !selectedId) return;
                  const styleToCopy = {
                    shape: selectedNode.style?.shape,
                    structure: selectedNode.style?.structure,
                    fontSize: selectedNode.style?.fontSize,
                    fontWeight: selectedNode.style?.fontWeight,
                    color: selectedNode.style?.color,
                    backgroundColor: selectedNode.style?.backgroundColor,
                    borderColor: selectedNode.style?.borderColor,
                    borderStyle: selectedNode.style?.borderStyle
                  };
                  onApplyStyleToLevel(selectedId, styleToCopy);
                }}
              >
                套用至同階層節點
              </button>
            </div>

            {/* Badges, Labels, Notes Section */}
            <div className="inspector-divider" style={{ margin: '20px 0 16px', borderTop: '1px dashed var(--theme-glass-border)' }} />
            
            <div className="inspector-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>節點標記與備註</div>
            
            <div className="inspector-row">
              <span className="inspector-label">優先級</span>
              <select
                className="inspector-select"
                value={selectedNode.priority || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateData(selectedNode.id, { priority: val ? parseInt(val, 10) : undefined });
                }}
              >
                <option value="">無</option>
                <option value="1">P1 (高)</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
                <option value="4">P4</option>
                <option value="5">P5</option>
                <option value="6">P6</option>
                <option value="7">P7</option>
                <option value="8">P8</option>
                <option value="9">P9 (低)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">任務進度</span>
              <select
                className="inspector-select"
                value={selectedNode.progress !== undefined ? selectedNode.progress.toString() : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateData(selectedNode.id, { progress: val ? parseInt(val, 10) : undefined });
                }}
              >
                <option value="">無</option>
                <option value="0">0% (未開始)</option>
                <option value="25">25% (進行中)</option>
                <option value="50">50% (半數完成)</option>
                <option value="75">75% (即將完成)</option>
                <option value="100">100% (已完成)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">自訂標籤</span>
              <input
                type="text"
                className="inspector-input"
                placeholder="以逗號分隔，例如: 重要, 待辦"
                value={selectedNode.labels ? selectedNode.labels.join(', ') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const labels = val ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                  onUpdateData(selectedNode.id, { labels });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--theme-glass-border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'var(--theme-text-color)',
                  fontSize: '12px',
                  width: '60%',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <span className="inspector-label" style={{ display: 'block', marginBottom: '6px' }}>詳細備註說明</span>
              <textarea
                className="inspector-textarea"
                placeholder="在這裡輸入此主題的詳細備註、待辦細節或參考資料..."
                value={selectedNode.note || ''}
                onChange={(e) => {
                  onUpdateData(selectedNode.id, { note: e.target.value || undefined });
                }}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--theme-glass-border)',
                  borderRadius: '6px',
                  padding: '8px',
                  color: 'var(--theme-text-color)',
                  fontSize: '12px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div className="inspector-divider" style={{ margin: '20px 0', borderTop: '1px solid var(--theme-glass-border)' }} />

            <div style={{ marginTop: '16px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <span className="inspector-title" style={{ margin: 0 }}>節點外框 (Boundary)</span>
                <input
                  type="checkbox"
                  checked={!!selectedNode.boundary}
                  onChange={(e) => {
                    const active = e.target.checked;
                    if (active) {
                      onUpdateData(selectedNode.id, {
                        boundary: {
                          title: '外框名稱',
                          fillColor: 'rgba(99, 102, 241, 0.05)',
                          borderColor: '#6366f1',
                          borderStyle: 'dashed'
                        }
                      });
                    } else {
                      onUpdateData(selectedNode.id, { boundary: undefined });
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {selectedNode.boundary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
                  <div className="inspector-row">
                    <span className="inspector-label">外框標題</span>
                    <input
                      type="text"
                      className="inspector-input"
                      value={selectedNode.boundary.title || ''}
                      onChange={(e) => {
                        onUpdateData(selectedNode.id, {
                          boundary: {
                            ...selectedNode.boundary!,
                            title: e.target.value
                          }
                        });
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--theme-glass-border)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: 'var(--theme-text-color)',
                        fontSize: '12px',
                        width: '60%',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div className="inspector-row">
                    <span className="inspector-label">邊框樣式</span>
                    <select
                      className="inspector-select"
                      value={selectedNode.boundary.borderStyle || 'dashed'}
                      onChange={(e) => {
                        onUpdateData(selectedNode.id, {
                          boundary: {
                            ...selectedNode.boundary!,
                            borderStyle: e.target.value as 'dashed' | 'solid'
                          }
                        });
                      }}
                    >
                      <option value="solid">實線 (Solid)</option>
                      <option value="dashed">虛線 (Dashed)</option>
                    </select>
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <span className="inspector-label" style={{ display: 'block', marginBottom: '8px' }}>外框配色選擇</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {PRES_BOUNDARY_COLORS.map((item) => {
                        const isCurrent = selectedNode.boundary?.borderColor === item.border;
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              onUpdateData(selectedNode.id, {
                                boundary: {
                                  ...selectedNode.boundary!,
                                  fillColor: item.fill,
                                  borderColor: item.border
                                }
                              });
                            }}
                            style={{
                              background: item.fill,
                              border: `1.5px ${isCurrent ? 'solid' : 'dashed'} ${item.border}`,
                              borderRadius: '6px',
                              padding: '6px 4px',
                              fontSize: '10px',
                              color: 'var(--theme-text-color)',
                              cursor: 'pointer',
                              fontWeight: isCurrent ? 'bold' : 'normal',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              transform: isCurrent ? 'scale(1.05)' : 'none'
                            }}
                          >
                            {item.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 節點概要 (Summary) Section */}
            {selectedId && (
              <>
                <div className="inspector-divider" style={{ margin: '20px 0 16px', borderTop: '1px dashed var(--theme-glass-border)' }} />
                
                <div className="inspector-section" style={{ padding: '0 4px' }}>
                  {!selectedId.startsWith('summary-') ? (
                    // For regular sub-nodes (excluding root)
                    selectedId !== 'root' && (
                      <div className="inspector-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="inspector-title" style={{ margin: 0 }}>節點概要 (Summary)</span>
                        <button
                          className="inspector-button-primary"
                          onClick={() => onAddSummary?.(selectedId, selectedId)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--theme-accent-color)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          新增概要
                        </button>
                      </div>
                    )
                  ) : (
                    // For summary nodes themselves
                    (() => {
                      const parentNode = findParent(tree, selectedId);
                      const siblings = parentNode ? parentNode.children : [];
                      const summaryNode = selectedNode as any;
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="inspector-title" style={{ margin: 0 }}>節點概要範圍設定</div>
                          
                          <div className="inspector-row">
                            <span className="inspector-label">起始節點</span>
                            <select
                              className="inspector-select"
                              value={summaryNode.startNodeId || ''}
                              onChange={(e) => onUpdateSummaryRange?.(selectedId, e.target.value, summaryNode.endNodeId)}
                            >
                              {siblings.map((sib) => (
                                <option key={sib.id} value={sib.id}>{sib.text}</option>
                              ))}
                            </select>
                          </div>

                          <div className="inspector-row">
                            <span className="inspector-label">結束節點</span>
                            <select
                              className="inspector-select"
                              value={summaryNode.endNodeId || ''}
                              onChange={(e) => onUpdateSummaryRange?.(selectedId, summaryNode.startNodeId, e.target.value)}
                            >
                              {siblings.map((sib) => (
                                <option key={sib.id} value={sib.id}>{sib.text}</option>
                              ))}
                            </select>
                          </div>

                          <div className="inspector-row" style={{ marginTop: '4px' }}>
                            <button
                              className="inspector-button-danger"
                              onClick={() => onDeleteSummary?.(selectedId)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                textAlign: 'center'
                              }}
                            >
                              刪除此概要
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: '13px', opacity: 0.5, textAlign: 'center', marginTop: '20px' }}>
            請點選畫布上的任何節點以進行自訂編輯。
          </div>
        )}
      </div>

      {/* 3. Supabase Auth Integration */}
      <div className="inspector-section" style={{ borderTop: '1px solid var(--theme-glass-border)', paddingTop: '20px', marginBottom: 0 }}>
        <div className="inspector-title">雲端同步狀態</div>
        <div className="auth-panel">
          {!isSupabaseConfigured ? (
            <div className="db-status-pill db-status-offline" style={{ alignSelf: 'start', marginBottom: '8px' }}>
              <CloudOff size={14} /> 本地儲存模式 (未設定 API)
            </div>
          ) : user ? (
            <>
              <div className="user-profile">
                <img
                  src={user.user_metadata?.avatar_url || 'https://www.gravatar.com/avatar?d=mp'}
                  alt="Avatar"
                  className="user-avatar"
                />
                <span className="user-email" title={user.email}>
                  {user.email}
                </span>
              </div>
              <div className="inspector-row" style={{ margin: 0 }}>
                <div className={`db-status-pill ${isSyncing ? 'db-status-offline' : 'db-status-online'}`}>
                  {isSyncing ? (
                    <>
                      <RefreshCw size={12} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                      同步中...
                    </>
                  ) : (
                    <>
                      <Cloud size={14} /> 已連線至雲端
                    </>
                  )}
                </div>
                <button className="btn-secondary" onClick={onLogout} style={{ padding: '4px 8px', fontSize: '12px' }}>
                  <LogOut size={12} /> 登出
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                登入帳號以啟用即時雲端儲存與跨裝置同步。
              </div>
              <button className="btn-primary" onClick={onLogin}>
                <LogIn size={14} /> 使用 Google 登入
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default Inspector;
