import { FLAG_MARKERS, PERSON_MARKERS, SYMBOL_MARKERS, NodeMarker } from './NodeMarker';
import { FILL_STYLES, nodeFillImage } from '../utils/nodeFill';
import React, { useState, useEffect } from 'react';
import type { MindMapNode, MindMapTheme } from '../types/mindmap';
import { THEMES } from '../utils/themes';
import { Flag, Sliders, Settings, X, Bold, Strikethrough, ChevronDown, Keyboard } from 'lucide-react';
import { findParent } from '../utils/treeUtils';
import { useI18n } from '../context/I18nContext';

interface InspectorProps {
  isOpen: boolean;
  onClose: () => void;
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
}


const FOCUS_NODE_PALETTES = [
  { label: 'colorEmerald', fill: '#edf6ef', border: '#c8dfcf', text: '#365d45', swatch: '#8dbd9e' },
  { label: 'colorIndigo', fill: '#f0f4fa', border: '#d8e1ed', text: '#3e587a', swatch: '#91aaca' },
  { label: 'colorAmber', fill: '#faf3eb', border: '#eedecf', text: '#77543b', swatch: '#d8b493' },
  { label: 'colorViolet', fill: '#f6f0fa', border: '#e4d9ed', text: '#694d7d', swatch: '#b89acb' },
  { label: 'colorSlate', fill: '#f0f3f4', border: '#dbe2e3', text: '#455c65', swatch: '#91a4aa' },
];

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
  isOpen, onClose,
  selectedId,
  selectedNode,
  tree,
  theme,
  isAutoLayout,
  onToggleAutoLayout,
  onUpdateStyle,
  onApplyStyleToLevel,
  onUpdateData,
  onChangeTheme
}) => {
  const { t } = useI18n();
  const nodePalettes = theme.id === 'focus-mint' ? FOCUS_NODE_PALETTES :
    (theme.branchColors?.length ? theme.branchColors : theme.levelBackgrounds || [theme.nodeDefaultBackground]).map((fill, index) => {
      // Choose the more legible text color for each theme swatch.
      const channels = fill.replace('#', '').match(/.{2}/g)?.map(value => {
        const channel = parseInt(value, 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      }) || [1, 1, 1];
      const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      return { label: String(index + 1), fill, border: fill, text: luminance > 0.179 ? '#1a1a1a' : '#ffffff', swatch: fill };
    });

  const rootNode = tree.children.find((c) => c.id === 'root');
  const isTimelineMode = rootNode?.style?.structure === 'timeline';
  const [activeTab, setActiveTab] = React.useState<'node' | 'markers' | 'map'>('node');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePickerRef = React.useRef<HTMLDivElement>(null);
  const themeName = (item: MindMapTheme) => {
    const key = 'theme_' + item.id.split('-')[0];
    return t(key) !== key ? t(key) : item.name;
  };
  const themeSwatches = (item: MindMapTheme) => (
    <span className="theme-color-strip" aria-hidden="true">
      {[item.rootBackground, ...(item.branchColors || [item.nodeDefaultBackground])].map((color, index) =>
        <i key={index} style={{ backgroundColor: color }} />)}
    </span>
  );
  useEffect(() => { setThemePickerOpen(false); }, [isOpen, activeTab, tree.id]);
  useEffect(() => {
    if (!themePickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!themePickerRef.current?.contains(event.target as Node)) setThemePickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setThemePickerOpen(false);
        themePickerRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [themePickerOpen]);


  const renderProgressIconSvg = (progress: number) => {
    const radius = 3;
    const circumference = 2 * Math.PI * radius; // ~18.85
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    if (progress === 100) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block' }}>
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
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block' }}>
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
  useEffect(() => { setActivePicker(null); }, [selectedId, isOpen, activeTab]);

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
  const currentFontWeight = selectedNode?.style?.fontWeight || (selectedId === 'root' ? '700' : '500');
  const currentColor = selectedNode?.style?.color || '';
  const currentBg = selectedNode?.style?.backgroundColor || '';
  const currentBorderColor = selectedNode?.style?.borderColor || '';

  return (
    <>
      <div 
        className="inspector-panel glass-panel"
        inert={!isOpen}
        data-open={isOpen}
        aria-label={t('properties')}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(360px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
      <div className="focus-panel-heading"><strong>{t('properties')}</strong><button className="focus-icon-button" onClick={onClose} aria-label={t('closeSettings')}><X size={17}/></button></div>
      {isOpen && activePicker && (
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
          <span>{t('inspectorStyle')}</span>
        </button>
        <button className={`inspector-tab-btn ${activeTab === 'markers' ? 'active' : ''}`} onClick={() => setActiveTab('markers')}>
          <Flag size={14} className="tab-icon" />
          <span>{t('inspectorMarkers')}</span>
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Settings size={14} className="tab-icon" />
          <span>{t('inspectorMap')}</span>
        </button>
      </div>

      {/* 1. Workspace Theme */}
      {activeTab === 'map' && (
        <div className="inspector-section">
          <div className="inspector-title">{t('inspectorMap')}</div>
          
          <div className="theme-picker" ref={themePickerRef}>
            <span className="inspector-label">{t('themeSelect')}</span>
            <button type="button" className="theme-picker-trigger" aria-expanded={themePickerOpen} aria-controls="theme-picker-options" onClick={() => setThemePickerOpen(open => !open)}>
              {themeSwatches(theme)}
              <span>{themeName(theme)}</span>
              <ChevronDown size={16} />
            </button>
            {themePickerOpen && (
              <div id="theme-picker-options" className="compact-theme-previews" role="group" aria-label={t('themeSelect')}>
                {THEMES.map(item => (
                  <button type="button" key={item.id} data-theme-id={item.id} aria-pressed={theme.id === item.id} className={theme.id === item.id ? 'active' : ''} onClick={() => {
                    onChangeTheme(item);
                    setThemePickerOpen(false);
                    themePickerRef.current?.querySelector('button')?.focus();
                  }}>
                    <span>{themeName(item)}</span>
                    {themeSwatches(item)}
                  </button>
                ))}
              </div>
            )}
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

      {activeTab === 'markers' && (
        <div className="inspector-section">
          {selectedNode ? <>
            <section className="marker-category">
              <h3>{t('priority')}</h3>
              <div className="marker-picker-grid">
                {[1,2,3,4,5,6,7,8,9].map(priority => <button type="button" key={priority} className="flag-btn" aria-label={`${t('priority')} ${priority}`} title={`${t('priority')} ${priority}`} aria-pressed={selectedNode.priority === priority} onClick={() => onUpdateData(selectedNode.id, {priority})}><span className={`node-badge-priority priority-${priority}`}>{priority}</span></button>)}
                <button type="button" className="marker-clear-btn" aria-label={t('clearPriority')} title={t('clearPriority')} disabled={!selectedNode.priority} onClick={() => onUpdateData(selectedNode.id, {priority:undefined})}><X size={14}/></button>
              </div>
            </section>
            <section className="marker-category">
              <h3>{t('taskProgress')}</h3>
              <div className="marker-picker-grid">
                {[0,25,50,75,100].map(progress => <button type="button" key={progress} className="flag-btn" aria-label={`${t('taskProgress')} ${progress}%`} title={`${progress}%`} aria-pressed={selectedNode.progress === progress} onClick={() => onUpdateData(selectedNode.id, {progress})}><span className="node-badge-progress">{renderProgressIconSvg(progress)}</span></button>)}
                <button type="button" className="marker-clear-btn" aria-label={t('clearProgress')} title={t('clearProgress')} disabled={selectedNode.progress === undefined} onClick={() => onUpdateData(selectedNode.id, {progress:undefined})}><X size={14}/></button>
              </div>
            </section>
            {[ 
              {label:'markersAndFlags', markers:FLAG_MARKERS},
              {label:'markerPeople', markers:PERSON_MARKERS},
              {label:'markerSymbols', markers:SYMBOL_MARKERS},
            ].map(group => <section className="marker-category" key={group.label}>
              <h3>{t(group.label)}</h3>
              <div className="marker-picker-grid">
                {group.markers.map(marker => <button type="button" key={marker.id} className="flag-btn" data-marker-id={marker.id} aria-label={t(marker.label)} title={t(marker.label)} aria-pressed={selectedNode.flag === marker.id} onClick={() => onUpdateData(selectedNode.id, {flag: marker.id})}>
                  <NodeMarker id={marker.id} t={t}/>
                </button>)}
                <button type="button" className="marker-clear-btn" aria-label={`${t('clearMarker')}: ${t(group.label)}`} title={`${t('clearMarker')}: ${t(group.label)}`} disabled={!group.markers.some(marker => marker.id === selectedNode.flag)} onClick={() => onUpdateData(selectedNode.id, {flag: undefined})}><X size={14}/></button>
              </div>
            </section>)}

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



            <section className="compact-property-section compact-note-section">
              <h3><label htmlFor="compact-topic-note">{t('topicNote')}</label><small>{t('noteHint')}</small></h3>
              <textarea id="compact-topic-note" aria-label={t('topicNote')} placeholder={t('compactNotePlaceholder')} value={selectedNode.note || ''}
                onChange={event => onUpdateData(selectedNode.id, {note: event.target.value})}/>
            </section>
          </> : <div className="inspector-empty-selection">{t('selectNodePrompt')}</div>}
        </div>
      )}

      {/* 2. Selected Node Styles */}
      {activeTab === 'node' && (
        <div className="inspector-section" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedNode ? (
          <>
            <section className="compact-property-section">
              <h3>{t('textStyle')}</h3>
              <div className="compact-type-toolbar">
                <button type="button" className={Number(currentFontWeight) >= 600 ? 'active' : ''} aria-pressed={Number(currentFontWeight) >= 600} aria-label={t('weightBold')}
                  onClick={() => onUpdateStyle(selectedNode.id, { fontWeight: Number(currentFontWeight) >= 600 ? '500' : '700' })}><Bold size={17}/></button>
                <label className={`compact-strike-toggle ${selectedNode.style?.strikethrough ? 'active' : ''}`} title={t('strikethrough')}>
                  <input id="node-strikethrough" type="checkbox" aria-label={t('strikethrough')} checked={selectedNode.style?.strikethrough ?? false}
                    onChange={event => onUpdateStyle(selectedNode.id, { strikethrough: event.target.checked })}/>
                  <Strikethrough size={17}/>
                </label>
                <select aria-label={t('fontSize')} value={selectedNode.style?.fontSize || ''} onChange={event => onUpdateStyle(selectedNode.id, { fontSize: event.target.value || undefined })}>
                  <option value="">{t('autoFontSize')}</option>
                  {[12,14,16,18,22].map(size => <option key={size} value={`${size}px`}>{size} px</option>)}
                </select>
                <button type="button" className={`compact-text-color ${activePicker === 'text' ? 'active' : ''}`} aria-label={t('textColor')} title={t('textColor')} aria-expanded={activePicker === 'text'} onClick={() => setActivePicker(activePicker === 'text' ? null : 'text')}>
                  <span aria-hidden="true">A</span>
                  <i aria-hidden="true" style={{backgroundColor: currentColor || (selectedId === 'root' ? theme.rootColor : theme.nodeDefaultColor)}} />
                </button>
                {activePicker === 'text' && renderColorPickerDropdown('text', currentColor, handleColorSelect)}
              </div>
            </section>
            <section className="compact-property-section">
              <div className="compact-section-heading"><h3>{t('nodePalette')}</h3><button type="button" className="compact-reset" onClick={() => onUpdateStyle(selectedNode.id, {backgroundColor: undefined, borderColor: undefined, color: undefined})}>{t('restoreDefault')}</button></div>
              <div className="compact-palette-row">
                {nodePalettes.map(palette => <button key={palette.fill} type="button" aria-label={`${t('nodePalette')}: ${t(palette.label)}`} title={t(palette.label)} aria-pressed={selectedNode.style?.backgroundColor === palette.fill}
                  className={`compact-palette ${selectedNode.style?.backgroundColor === palette.fill ? 'active' : ''}`} style={{backgroundColor: palette.swatch}}
                  onClick={() => onUpdateStyle(selectedNode.id, {backgroundColor: palette.fill, borderColor: palette.border, color: palette.text})}/>) }
              </div>
            </section>
            <details open className="compact-advanced" onToggle={event => { if (!event.currentTarget.open) setActivePicker(null); }}>
              <summary>{t('advancedAppearance')}<ChevronDown size={15}/></summary>
              <div className="compact-advanced-body">

            <div className="inspector-row">
              <span className="inspector-label">{t('fillStyle')}</span>
              <details className="fill-style-picker">
                <summary><span className="fill-style-swatch" style={{backgroundColor: selectedNode.style?.fillStyle === 'none' ? 'transparent' : '#374b40', backgroundImage: nodeFillImage(selectedNode.style?.fillStyle, '#374b40')}}/><span>{t('fill_' + (selectedNode.style?.fillStyle || 'solid'))}</span><ChevronDown size={14}/></summary>
                <div className="fill-style-options">
                  {FILL_STYLES.map(style => <button type="button" key={style} title={t('fill_' + style)} aria-label={t('fill_' + style)} aria-pressed={(selectedNode.style?.fillStyle || 'solid') === style} data-fill-style={style} onClick={event => {
                    onUpdateStyle(selectedNode.id, {fillStyle: style});
                    const picker = event.currentTarget.closest('details');
                    if (picker) { picker.open = false; picker.querySelector('summary')?.focus(); }
                  }}><span className="fill-style-swatch" style={{backgroundColor: style === 'none' ? 'transparent' : '#374b40', backgroundImage: nodeFillImage(style, '#374b40')}}/><span>{t('fill_' + style)}</span></button>)}
                </div>
              </details>
            </div>

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
                    fillStyle: selectedNode.style?.fillStyle,
                    shape: selectedNode.style?.shape,
                    structure: selectedNode.style?.structure,
                    fontSize: selectedNode.style?.fontSize,
                    fontWeight: selectedNode.style?.fontWeight,
                    strikethrough: selectedNode.style?.strikethrough ?? false,
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

              </div>
            </details>
            <details className="compact-advanced" onToggle={event => { if (!event.currentTarget.open) setActivePicker(null); }}>
              <summary>{t('boundaryTitle')}<ChevronDown size={15}/></summary>
              <div className="compact-advanced-body">
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
              </div>
            </details>
            <div className="compact-keyboard-hint"><Keyboard size={17}/><span><kbd>Tab</kbd> {t('shortcutTab')}<br/><kbd>{t('shortcutOrDblClick').replace(/^或/, '').trim()}</kbd> {t('shortcutF2')}</span></div>
          </>
        ) : (
          <div style={{ fontSize: '13px', opacity: 0.5, textAlign: 'center', marginTop: '40px' }}>
            {t('selectNodePrompt')}
          </div>
        )}
      </div>
      )}
    </div>
    </>
  );
};
export default Inspector;
