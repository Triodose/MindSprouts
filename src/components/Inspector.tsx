import React, { useState, useEffect } from 'react';
import type { MindMapNode, MindMapTheme } from '../types/mindmap';
import { THEMES } from '../utils/themes';
import { Flag, Star, Heart, HelpCircle, Info, Sliders, Settings } from 'lucide-react';
import { findParent } from '../utils/treeUtils';
import { useI18n } from '../context/I18nContext';

interface InspectorProps {
  selectedId: string | null;
  selectedNode: MindMapNode | null;
  tree: MindMapNode;
  theme: MindMapTheme;
  isAutoLayout: boolean;
  onToggleAutoLayout: (active: boolean) => void;
  onUpdateStyle: (id: string, style: Partial<MindMapNode['style']>) => void;
  onApplyStyleToLevel: (id: string, style: Partial<MindMapNode['style']>) => void;
  onUpdateData: (id: string, data: Partial<MindMapNode>) => void;
  onChangeTheme: (theme: MindMapTheme) => void;
  onSelectNode?: (id: string | null) => void;
}


const PRES_BOUNDARY_COLORS = [
  { key: 'colorIndigo', fill: 'rgba(99, 102, 241, 0.05)', border: '#6366f1' },
  { key: 'colorRose', fill: 'rgba(244, 63, 94, 0.05)', border: '#f43f5e' },
  { key: 'colorEmerald', fill: 'rgba(16, 185, 129, 0.05)', border: '#10b981' },
  { key: 'colorAmber', fill: 'rgba(245, 158, 11, 0.05)', border: '#f59e0b' },
  { key: 'colorViolet', fill: 'rgba(139, 92, 246, 0.05)', border: '#8b5cf6' },
  { key: 'colorSlate', fill: 'rgba(148, 163, 184, 0.06)', border: '#94a3b8' }
];

const GRID_PRESET_COLORS = [
  '#FFFFFF', '#F2F2F2', '#E0E0E0', '#C0C0C0', '#9E9E9E', '#757575', '#616161', '#424242', '#000000',
  '#FFF59D', '#FFAB91', '#A5D6A7', '#80CBC4', '#81D4FA', '#90CAF9', '#9FA8DA', '#B39DDB', '#F48FB1',
  '#FFEE58', '#FF7043', '#66BB6A', '#26A69A', '#29B6F6', '#42A5F5', '#5C6BC0', '#7E57C2', '#EC407A',
  '#FBC02D', '#F4511E', '#43A047', '#00897B', '#00ACC1', '#1E88E5', '#3F51B5', '#673AB7', '#D81B60',
  '#EF6C00', '#C62828', '#2E7D32', '#00695C', '#00838F', '#1565C0', '#283593', '#4527A0', '#880E4F'
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
  isAutoLayout,
  onToggleAutoLayout,
  onUpdateStyle,
  onApplyStyleToLevel,
  onUpdateData,
  onChangeTheme,
  onSelectNode
}) => {
  const { t } = useI18n();
  const rootNode = tree.children.find((c) => c.id === 'root');
  const isTimelineMode = rootNode?.style?.structure === 'timeline';
  const [activeTab, setActiveTab] = React.useState<'node' | 'map'>('node');

  const renderProgressIconSvg = (progress: number) => {
    const radius = 3;
    const circumference = 2 * Math.PI * radius; // ~18.85
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    if (progress === 100) {
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block' }}>
          <circle cx="8" cy="8" r="7" fill="#10b981" />
          <path
            d="M5 8 l2 2 l4 -4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    return (
      <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block' }}>
        <circle cx="8" cy="8" r="6" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
        {progress > 0 && (
          <circle
            cx="8"
            cy="8"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 8 8)"
          />
        )}
      </svg>
    );
  };

  const getInheritedStructure = (nodeId: string): string => {
    let currId = nodeId;
    let inherited = 'logic';
    while (currId && currId !== 'root') {
      const parentNode = findParent(tree, currId);
      if (!parentNode) break;
      if (parentNode.style?.structure) {
        inherited = parentNode.style.structure;
        break;
      }
      currId = parentNode.id;
    }
    if (currId === 'root') {
      const rootNode = tree.children.find((c) => c.id === 'root');
      inherited = rootNode?.style?.structure || 'logic';
    }

    if (inherited === 'timeline') {
      const parentNode = findParent(tree, nodeId);
      const isDirectChild = parentNode && parentNode.style?.structure === 'timeline';
      if (!isDirectChild) {
        return 'logic';
      }
    }
    return inherited;
  };

  const getStructureName = (structureKey: string): string => {
    const names: Record<string, string> = {
      'logic': t('structureLogicRight'),
      'logic-left': t('structureLogicLeft'),
      'mindmap': t('structureMindmap'),
      'org': t('structureOrg'),
      'tree': t('structureTree'),
      'brace': t('structureBrace'),
      'timeline': t('structureTimeline'),
      'fishbone': t('structureFishbone')
    };
    return names[structureKey] || structureKey;
  };

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

  const handleLineStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    onUpdateStyle(selectedId, { lineStyle: e.target.value as any });
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedId) return;
    const val = e.target.value;
    onUpdateStyle(selectedId, { structure: val ? (val as any) : undefined });
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
        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{t('themeSelect')}</span>
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
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{t('customColor')}</span>
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(9, 1fr)', 
              gap: '4px',
              marginTop: '2px'
            }}
          >
            {GRID_PRESET_COLORS.map((c) => (
              <div
                key={`${type}-grid-${c}`}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: value?.toLowerCase() === c.toLowerCase() ? '1.5px solid var(--theme-ui-accent-color)' : '1px solid rgba(0,0,0,0.15)',
                  boxSizing: 'border-box',
                  transition: 'transform 0.1s'
                }}
                onClick={() => onChange(c)}
                className="color-swatch-rect"
                title={c}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              value={displayValue}
              onChange={(e) => onChange(e.target.value || undefined)}
              placeholder="#hex"
              className="inspector-input"
              style={{ 
                flexGrow: 1, 
                padding: '4px 6px', 
                fontSize: '11px',
                height: '24px',
                borderRadius: '4px',
                border: '1px solid var(--theme-glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--theme-text-color)',
                outline: 'none',
                width: '60px'
              }}
            />
            
            <div 
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: displayValue === 'transparent' ? 'transparent' : (displayValue || 'rgba(255,255,255,0.2)'),
                border: '1px solid var(--theme-glass-border)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              {displayValue === 'transparent' && (
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

            <input 
              id={`hidden-picker-${type}`}
              type="color" 
              value={displayValue.startsWith('#') ? displayValue : '#ffffff'} 
              onChange={(e) => onChange(e.target.value)}
              style={{ display: 'none' }}
            />

            <div
              className="color-wheel-btn"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
                border: '1px solid var(--theme-glass-border)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'transform 0.1s'
              }}
              onClick={() => {
                const el = document.getElementById(`hidden-picker-${type}`);
                if (el) el.click();
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              title={t("customColorPicker")}
            />
          </div>
        </div>

        {type !== 'text' && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              onClick={() => {
                onChange(undefined);
                setActivePicker(null);
              }}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--theme-glass-border)',
                color: 'var(--theme-text-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {t('restoreDefault')}
            </button>
            <button
              onClick={() => {
                onChange('transparent');
                setActivePicker(null);
              }}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {t('setTransparent')}
            </button>
          </div>
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
  const currentLineStyle = selectedNode?.style?.lineStyle || 'curve';
  const currentStructure = selectedNode?.style?.structure || '';
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
      {/* Tabs Header */}
      <div className="inspector-tabs">
        <button
          className={`inspector-tab-btn ${activeTab === 'node' ? 'active' : ''}`}
          onClick={() => setActiveTab('node')}
        >
          <Sliders size={14} className="tab-icon" />
          <span>{t('properties')}</span>
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Settings size={14} className="tab-icon" />
          <span>{t('mindmapConfig')}</span>
        </button>
      </div>

      {/* 1. Workspace Theme */}
      {activeTab === 'map' && (
        <div className="inspector-section">
          <div className="inspector-title">{t('mindmapConfig')}</div>
          
          <div className="inspector-row">
            <span className="inspector-label">{t('themeSelect')}</span>
            <select
              className="inspector-select"
              value={theme.id}
              onChange={(e) => {
                const selected = THEMES.find((t) => t.id === e.target.value);
                if (selected) onChangeTheme(selected);
              }}
            >
              {THEMES.map((themeItem) => (
                <option key={themeItem.id} value={themeItem.id}>
                  {t('theme_' + themeItem.id.split('-')[0]) !== 'theme_' + themeItem.id.split('-')[0]
                    ? t('theme_' + themeItem.id.split('-')[0])
                    : themeItem.name}
                </option>
              ))}
            </select>
          </div>

          <div className="inspector-row" style={{ marginTop: '8px' }}>
            <span className="inspector-label">{t('mapLayout')}</span>
            <select
              className="inspector-select"
              value={tree.children.find((c) => c.id === 'root')?.style?.structure || 'logic'}
              onChange={(e) => onUpdateStyle('root', { structure: e.target.value as any })}
            >
              <option value="mindmap">{t('structureMindmap')} (Mind Map)</option>
              <option value="logic">{t('structureLogicRight')} (Logic Right)</option>
              <option value="logic-left">{t('structureLogicLeft')} (Logic Left)</option>
              <option value="org">{t('structureOrg')} (Org Chart)</option>
              <option value="tree">{t('structureTree')} (Tree Chart)</option>
              <option value="brace">{t('structureBrace')} (Brace Map)</option>
              <option value="timeline">{t('structureTimeline')} (Timeline)</option>
              <option value="fishbone">{t('structureFishbone')} (Fishbone)</option>
            </select>
          </div>

          <div className="inspector-row" style={{ marginTop: '8px' }}>
            <span className="inspector-label">{t('handDrawnMode')}</span>
            <select
              className="inspector-select"
              value={tree.children.find((c) => c.id === 'root')?.style?.handDrawn ? 'true' : 'false'}
              onChange={(e) => onUpdateStyle('root', { handDrawn: e.target.value === 'true' } as any)}
            >
              <option value="false">{t('handDrawnDisabled')}</option>
              <option value="true">{t('handDrawnEnabled')}</option>
            </select>
          </div>

          <div className="inspector-row" style={{ marginTop: '8px' }}>
            <span className="inspector-label">{t('autoLayout')}</span>
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
      )}

      {/* 2. Selected Node Styles */}
      {activeTab === 'node' && (
        <div className="inspector-section" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="inspector-title">{t('nodeStyleSettings')}</div>
        {selectedNode ? (
          <>
            <div className="inspector-row">
              <span className="inspector-label">{t('shape')}</span>
              <select
                className="inspector-select"
                value={currentShape}
                onChange={handleShapeChange}
              >
                <option value="rounded">{t('shapeRoundedRect')} (Rounded)</option>
                <option value="rectangle">{t('shapeRect')} (Rectangle)</option>
                <option value="underlined">{t('shapeUnderline')} (Underline)</option>
                <option value="diamond">{t('shapeDiamond')} (Diamond)</option>
                <option value="circle">{t('shapeCircle')} (Circle)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">{t('borderLineStyle')}</span>
              <select
                className="inspector-select"
                value={currentBorderStyle}
                onChange={handleBorderStyleChange}
              >
                <option value="solid">{t('borderLineStyleSolid')} (Solid)</option>
                <option value="dashed">{t('borderLineStyleDashed')} (Dashed)</option>
                <option value="long-dashed">{t('borderLineStyleLongDashed')} (Long Dashed)</option>
                <option value="dotted">{t('borderLineStyleDotted')} (Dotted)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">{t('branchLineStyle')}</span>
              <select
                className="inspector-select"
                value={currentLineStyle}
                onChange={handleLineStyleChange}
              >
                <option value="curve">{t('branchLineStyleCurve')} (Curve)</option>
                <option value="straight">{t('branchLineStyleStraight')} (Straight)</option>
                <option value="tapered">{t('branchLineStyleTapered')} (Tapered)</option>
              </select>
            </div>

            <div className="inspector-row" style={{ position: 'relative' }}>
              <span className="inspector-label">{t('borderColor')}</span>
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
                  <span style={{ fontSize: '12px' }}>{currentBorderColor || t('default')}</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </div>
              {activePicker === 'border' && renderColorPickerDropdown('border', currentBorderColor, handleBorderSelect)}
            </div>

            {!isTimelineMode && selectedId !== 'root' && (
              <div className="inspector-row">
                <span className="inspector-label">{t('branchStructure')}</span>
                <select
                  className="inspector-select"
                  value={currentStructure}
                  onChange={handleStructureChange}
                >
                  {selectedId && selectedId !== 'root' && (
                    <option value="">{t('inheritParent')} ({t('default')}: {getStructureName(getInheritedStructure(selectedId))})</option>
                  )}
                  {selectedNodeSide === 'left' ? (
                    <option value="logic-left">{t('structureLogicLeft')} (Logic Left)</option>
                  ) : (
                    <option value="logic">{t('structureLogicRight')} (Logic Right)</option>
                  )}
                  <option value="org">{t('structureOrg')} (Org Chart)</option>
                  <option value="tree">{t('structureTree')} (Tree Chart)</option>
                  <option value="brace">{t('structureBrace')} (Brace Map)</option>
                  <option value="timeline">{t('structureTimeline')} (Timeline)</option>
                  <option value="fishbone">{t('structureFishbone')} (Fishbone)</option>
                </select>
              </div>
            )}

            <div className="inspector-row">
              <span className="inspector-label">{t('fontSize')}</span>
              <select
                className="inspector-select"
                value={currentFontSize}
                onChange={handleFontSizeChange}
              >
                <option value="12px">{t('fontSmall')} (12px)</option>
                <option value="14px">{t('fontMedium')} (14px)</option>
                <option value="16px">{t('fontLarge')} (16px)</option>
                <option value="18px">{t('fontXLarge')} (18px)</option>
                <option value="22px">{t('fontXXLarge')} (22px)</option>
              </select>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">{t('fontWeight')}</span>
              <select
                className="inspector-select"
                value={currentFontWeight}
                onChange={handleFontWeightChange}
              >
                <option value="300">{t('weightLight')} (Light)</option>
                <option value="500">{t('weightRegular')} (Regular)</option>
                <option value="700">{t('weightBold')} (Bold)</option>
              </select>
            </div>

            <div className="inspector-row" style={{ position: 'relative' }}>
              <span className="inspector-label">{t('textColor')}</span>
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
                  <span style={{ fontSize: '12px' }}>{currentColor || t('default')}</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </div>
              {activePicker === 'text' && renderColorPickerDropdown('text', currentColor, handleColorSelect)}
            </div>

            {currentShape !== 'underlined' && (
              <div className="inspector-row" style={{ position: 'relative' }}>
                <span className="inspector-label">{t('fillColor')}</span>
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
                        backgroundColor: currentBg === 'transparent' ? 'transparent' : (currentBg || 'rgba(255,255,255,0.2)'),
                        border: '1px solid var(--theme-glass-border)',
                        position: 'relative',
                        overflow: 'hidden'
                      }} 
                    >
                      {currentBg === 'transparent' && (
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
                    <span style={{ fontSize: '12px' }}>
                      {currentBg === 'transparent' ? t('setTransparent') : currentBg ? currentBg : t('default')}
                    </span>
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
                    borderStyle: selectedNode.style?.borderStyle,
                    lineStyle: selectedNode.style?.lineStyle
                  };
                  onApplyStyleToLevel(selectedId, styleToCopy);
                }}
              >
                {t('applyLevel')}
              </button>
            </div>

            {/* Badges, Labels, Notes Section */}
            <div className="inspector-divider" style={{ margin: '20px 0 16px', borderTop: '1px dashed var(--theme-glass-border)' }} />
            
            <div className="inspector-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{t('nodeNotesTitle')}</div>
            
            <div className="inspector-row-vertical">
              <span className="inspector-label">{t('priority')}</span>
              <div className="priority-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-btn p-${p} ${selectedNode.priority === p ? 'active' : ''}`}
                    onClick={() => onUpdateData(selectedNode.id, { priority: p })}
                    title={`P${p}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="priority-clear-btn"
                  onClick={() => onUpdateData(selectedNode.id, { priority: undefined })}
                  title={t("clearPriority")}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="inspector-row-vertical" style={{ marginTop: '14px' }}>
              <span className="inspector-label">{t('taskProgress')}</span>
              <div className="progress-grid">
                {[0, 25, 50, 75, 100].map((progressValue) => (
                  <button
                    key={progressValue}
                    type="button"
                    className={`progress-btn ${selectedNode.progress === progressValue ? 'active' : ''}`}
                    onClick={() => onUpdateData(selectedNode.id, { progress: progressValue })}
                    title={`${progressValue}%`}
                  >
                    <span className="progress-btn-icon">
                      {renderProgressIconSvg(progressValue)}
                    </span>
                    <span className="progress-btn-text">{progressValue}%</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="progress-clear-btn"
                  onClick={() => onUpdateData(selectedNode.id, { progress: undefined })}
                  title={t("clearProgress")}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="inspector-row-vertical" style={{ marginTop: '14px' }}>
              <span className="inspector-label">{t('markersAndFlags')}</span>
              <div className="flag-picker-grid">
                {['red-flag', 'orange-flag', 'yellow-flag', 'green-flag', 'blue-flag', 'purple-flag', 'star', 'heart', 'question', 'info'].map((flagKey) => {
                  const flagTitleMap: Record<string, string> = {
                    'red-flag': t('flagRed'),
                    'orange-flag': t('flagOrange'),
                    'yellow-flag': t('flagYellow'),
                    'green-flag': t('flagGreen'),
                    'blue-flag': t('flagBlue'),
                    'purple-flag': t('flagPurple'),
                    'star': t('flagStar'),
                    'heart': t('flagHeart'),
                    'question': t('flagQuestion'),
                    'info': t('flagInfo')
                  };
                  const renderFlagIconHelper = (key: string) => {
                    const size = 14;
                    switch (key) {
                      case 'red-flag':
                      case 'orange-flag':
                      case 'yellow-flag':
                      case 'green-flag':
                      case 'blue-flag':
                      case 'purple-flag':
                        return <span className={`node-badge-flag flag-${key.split('-')[0]}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Flag size={size} fill="currentColor" /></span>;
                      case 'star':
                        return <span className="node-badge-flag flag-star" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Star size={size} fill="currentColor" /></span>;
                      case 'heart':
                        return <span className="node-badge-flag flag-heart" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={size} fill="currentColor" /></span>;
                      case 'question':
                        return <span className="node-badge-flag flag-question" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HelpCircle size={size} /></span>;
                      case 'info':
                        return <span className="node-badge-flag flag-info" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Info size={size} /></span>;
                      default:
                        return null;
                    }
                  };
                  return (
                    <button
                      key={flagKey}
                      type="button"
                      className={`flag-btn flag-${flagKey} ${selectedNode.flag === flagKey ? 'active' : ''}`}
                      onClick={() => onUpdateData(selectedNode.id, { flag: selectedNode.flag === flagKey ? undefined : flagKey })}
                      title={flagTitleMap[flagKey]}
                    >
                      {renderFlagIconHelper(flagKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">{t('customTags')}</span>
              <input
                type="text"
                className="inspector-input"
                placeholder={t("tagsPlaceholder")}
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



            <div className="inspector-divider" style={{ margin: '20px 0 16px', borderTop: '1px dashed var(--theme-glass-border)' }} />
            
            <div className="inspector-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{t('hyperlinkMedia')}</div>

            <div className="inspector-row-vertical" style={{ marginTop: '10px' }}>
              <span className="inspector-label">{t('hyperlink')}</span>
              <input
                className="inspector-input"
                type="text"
                placeholder={t("linkPlaceholder")}
                value={selectedNode.link || ''}
                onChange={(e) => onUpdateData(selectedNode.id, { link: e.target.value || undefined })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--theme-glass-border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'var(--theme-text-color)',
                  fontSize: '12px',
                  width: '100%',
                  outline: 'none',
                  marginTop: '4px'
                }}
              />
            </div>

            <div className="inspector-row-vertical" style={{ marginTop: '12px' }}>
              <span className="inspector-label">{t('embeddedImage')}</span>
              <input
                className="inspector-input"
                type="text"
                placeholder={t("imagePlaceholder")}
                value={selectedNode.image || ''}
                onChange={(e) => onUpdateData(selectedNode.id, { image: e.target.value || undefined })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--theme-glass-border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'var(--theme-text-color)',
                  fontSize: '12px',
                  width: '100%',
                  outline: 'none',
                  marginTop: '4px'
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
                <span className="inspector-title" style={{ margin: 0 }}>{t('boundaryTitle')}</span>
                <input
                  type="checkbox"
                  checked={!!selectedNode.boundary}
                  onChange={(e) => {
                    const active = e.target.checked;
                    if (active) {
                      onUpdateData(selectedNode.id, {
                        boundary: {
                          title: t('boundaryName'),
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
                    <span className="inspector-label">{t('boundaryTitleLabel')}</span>
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
                    <span className="inspector-label">{t('boundaryBorderStyle')}</span>
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
                      <option value="solid">{t('borderLineStyleSolid')} (Solid)</option>
                      <option value="dashed">{t('borderLineStyleDashed')} (Dashed)</option>
                    </select>
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <span className="inspector-label" style={{ display: 'block', marginBottom: '8px' }}>{t('boundaryColorSelect')}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {PRES_BOUNDARY_COLORS.map((item) => {
                        const isCurrent = selectedNode.boundary?.borderColor === item.border;
                        return (
                          <button
                            key={item.key}
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
                            {t(item.key)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sibling Range Selection for Multi-node Boundary */}
                  {(() => {
                    const parentNode = findParent(tree, selectedNode.id);
                    const siblings = parentNode ? parentNode.children : [];
                    if (siblings.length > 1) {
                      return (
                        <div className="inspector-row" style={{ marginTop: '12px' }}>
                          <span className="inspector-label">{t('boundaryEndNodeLabel') || '包覆至相鄰節點'}</span>
                          <select
                            className="inspector-select"
                            value={selectedNode.boundary?.endNodeId || ''}
                            onChange={(e) => {
                              onUpdateData(selectedNode.id, {
                                boundary: {
                                  ...selectedNode.boundary!,
                                  endNodeId: e.target.value || undefined
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
                          >
                            <option value="">{t('boundaryOnlySelf') || '僅自己與子節點'}</option>
                            {siblings.map((sib) => {
                              if (sib.id === selectedNode.id) return null;
                              return <option key={sib.id} value={sib.id}>{sib.text}</option>;
                            })}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '13px', opacity: 0.5, textAlign: 'center', marginTop: '40px' }}>
            {t('selectNodePrompt')}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
export default Inspector;
