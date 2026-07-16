import React, { useEffect, useRef, useState } from 'react';
import { Globe, Flag, Star, Heart, HelpCircle, Info, List } from 'lucide-react';
import type { MindMapNode as MindMapNodeType, MindMapTheme } from '../types/mindmap';

interface MindMapNodeProps {
  node: MindMapNodeType;
  parent?: MindMapNodeType;
  selectedId: string | null;
  editingId: string | null;
  zoom: number;
  isAutoLayout: boolean;
  isTopLevel?: boolean;
  isLeft?: boolean;
  onSelect: (id: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onUpdateText: (id: string, text: string) => void;
  onToggleCollapse: (id: string, side?: 'left' | 'right') => void;
  onUpdateOffset: (id: string, offset: { x: number; y: number } | undefined) => void;
  onEndDrag: (targetId?: string, finalOffset?: { x: number; y: number } | undefined) => void;
  onReparent: (nodeId: string, newParentId: string) => void;
  onReorder: (nodeId: string, targetId: string, position: 'before' | 'after') => void;
  onUpdateData: (id: string, data: Partial<MindMapNodeType>) => void;
  onOpenNoteEditor?: (nodeId: string) => void;
  isRoot?: boolean;
  depth?: number;
  inheritedStructure?: string;
  theme: MindMapTheme;
  branchIndex?: number;
  isTimelineMode?: boolean;
  extraMarginLeft?: number;
}

const renderProgressSvg = (progress: number) => {
  const radius = 3;
  const circumference = 2 * Math.PI * radius; // ~18.85
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (progress === 100) {
    return (
      <svg width="16" height="16" className="progress-svg" viewBox="0 0 16 16" style={{ display: 'block' }}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
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
    <svg width="16" height="16" className="progress-svg" viewBox="0 0 16 16" style={{ display: 'block' }}>
      {/* Outer border and white fill */}
      <circle cx="8" cy="8" r="6" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      {/* Pie slice progress */}
      {progress > 0 && (
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 8 8)"
        />
      )}
    </svg>
  );
};

const renderFlagIcon = (flagKey: string, t: (k: string) => string) => {
  const size = 13;
  switch (flagKey) {
    case 'red-flag':
      return <span className="node-badge-flag flag-red" title={t("flagRed")}><Flag size={size} fill="currentColor" /></span>;
    case 'orange-flag':
      return <span className="node-badge-flag flag-orange" title={t("flagOrange")}><Flag size={size} fill="currentColor" /></span>;
    case 'yellow-flag':
      return <span className="node-badge-flag flag-yellow" title={t("flagYellow")}><Flag size={size} fill="currentColor" /></span>;
    case 'green-flag':
      return <span className="node-badge-flag flag-green" title={t("flagGreen")}><Flag size={size} fill="currentColor" /></span>;
    case 'blue-flag':
      return <span className="node-badge-flag flag-blue" title={t("flagBlue")}><Flag size={size} fill="currentColor" /></span>;
    case 'purple-flag':
      return <span className="node-badge-flag flag-purple" title={t("flagPurple")}><Flag size={size} fill="currentColor" /></span>;
    case 'star':
      return <span className="node-badge-flag flag-star" title={t("flagStar")}><Star size={size} fill="currentColor" /></span>;
    case 'heart':
      return <span className="node-badge-flag flag-heart" title={t("flagHeart")}><Heart size={size} fill="currentColor" /></span>;
    case 'question':
      return <span className="node-badge-flag flag-question" title={t("flagQuestion")}><HelpCircle size={size} /></span>;
    case 'info':
      return <span className="node-badge-flag flag-info" title={t("flagInfo")}><Info size={size} /></span>;
    default:
      return null;
  }
};

const resolveColor = (colorStr: string): string => {
  if (!colorStr || colorStr === 'transparent') return 'transparent';
  if (colorStr.startsWith('var(')) {
    const match = colorStr.match(/var\(([^)]+)\)/);
    if (match) {
      const varName = match[1].trim();
      const appEl = document.querySelector('.mindmap-app');
      const targetEl = appEl || document.documentElement;
      const val = getComputedStyle(targetEl).getPropertyValue(varName).trim();
      if (val) return val;
    }
  }
  return colorStr;
};



const getDiamondBorderImage = (
  style: string,
  borderColor: string,
  bgColor: string,
  strokeWidth: number = 2
) => {
  const resolvedBorder = resolveColor(borderColor);
  const resolvedBg = resolveColor(bgColor);
  
  let dashes = '';
  if (style === 'dashed') dashes = "stroke-dasharray='6, 6'";
  else if (style === 'long-dashed') dashes = "stroke-dasharray='12, 6'";
  else if (style === 'dotted') dashes = "stroke-dasharray='2, 4'";
  
  const escapedBorder = resolvedBorder.replace('#', '%23');
  const escapedBg = resolvedBg.replace('#', '%23');
  
  // We use vector-effect="non-scaling-stroke" to keep stroke width uniform.
  // We fill the polygon with the background color so there is no bleed, and keep points slightly inside so it doesn't get clipped.
  return `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100' preserveAspectRatio='none'%3e%3cpolygon points='50,3.5 96.5,50 50,96.5 3.5,50' fill='${escapedBg}' stroke='${escapedBorder}' stroke-width='${strokeWidth}' vector-effect='non-scaling-stroke' ${dashes}/%3e%3c/svg%3e")`;
};

const lightenColor = (hexColor: string, percent: number): string => {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return hexColor;
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.min(255, Math.floor(r + (255 - r) * percent));
  g = Math.min(255, Math.floor(g + (255 - g) * percent));
  b = Math.min(255, Math.floor(b + (255 - b) * percent));

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#1e293b';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 140) ? '#1e293b' : '#ffffff';
};

const getNodeColors = (
  theme: MindMapTheme,
  branchIndex: number | undefined,
  depth: number,
  isRoot: boolean
): { backgroundColor: string; borderColor: string; color: string } => {
  const levelIndex = Math.min(depth || 0, 4);

  // If root node
  if (isRoot || depth === 0) {
    return {
      backgroundColor: theme.rootBackground,
      borderColor: theme.rootBorder,
      color: theme.rootColor
    };
  }

  // If there are branch colors and branchIndex is defined, use branch color
  if (theme.branchColors && theme.branchColors.length > 0 && branchIndex !== undefined) {
    const baseColor = theme.branchColors[branchIndex % theme.branchColors.length];
    
    let bgColor = baseColor;
    if (depth === 2) {
      bgColor = lightenColor(baseColor, 0.35);
    } else if (depth === 3) {
      bgColor = lightenColor(baseColor, 0.65);
    } else if (depth >= 4) {
      bgColor = lightenColor(baseColor, 0.85);
    }

    return {
      backgroundColor: bgColor,
      borderColor: bgColor,
      color: getContrastColor(bgColor)
    };
  }

  // Fallback to standard theme levels
  return {
    backgroundColor: (theme.levelBackgrounds && theme.levelBackgrounds[levelIndex]) || theme.nodeDefaultBackground,
    borderColor: (theme.levelBorders && theme.levelBorders[levelIndex]) || theme.nodeDefaultBorder,
    color: (theme.levelColors && theme.levelColors[levelIndex]) || theme.nodeDefaultColor
  };
};

const estimateNodeWidth = (node: MindMapNodeType): number => {
  const textLen = node.text || '';
  let estimatedTextWidth = 0;
  for (let i = 0; i < textLen.length; i++) {
    const code = textLen.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fff) {
      estimatedTextWidth += 14; // CJK character width
    } else {
      estimatedTextWidth += 8.5; // English character width
    }
  }
  let w = estimatedTextWidth + 36;
  if (node.progress !== undefined) w += 24;
  if (node.priority) w += 24;
  if (node.flag) w += 24;
  return Math.max(100, Math.min(300, w));
};

const calculateSubTreeWidth = (node: MindMapNodeType): number => {
  const nodeW = estimateNodeWidth(node);
  if (!node.children || node.children.length === 0 || node.isCollapsed) {
    return nodeW;
  }
  let maxChildW = 0;
  node.children.forEach((child) => {
    const childW = calculateSubTreeWidth(child);
    if (childW > maxChildW) maxChildW = childW;
  });
  return nodeW + 40 + maxChildW; // 40px is horizontal gap between brace layout nodes
};

const calculateDescendantSpan = (node: MindMapNodeType): number => {
  const nodeW = estimateNodeWidth(node);
  if (!node.children || node.children.length === 0 || node.isCollapsed) {
    return nodeW;
  }
  let maxChildW = 0;
  node.children.forEach((child) => {
    const childW = calculateSubTreeWidth(child);
    if (childW > maxChildW) maxChildW = childW;
  });
  return (nodeW / 2) + 12 + maxChildW;
};

export const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  parent,
  selectedId,
  editingId,
  zoom,
  isAutoLayout,
  isTopLevel = false,
  isLeft = false,
  onSelect,
  onStartEdit,
  onEndEdit,
  onUpdateText,
  onToggleCollapse,
  onUpdateOffset,
  onEndDrag,
  onReparent,
  onReorder,
  onUpdateData,
  onOpenNoteEditor,
  isRoot = false,
  depth = 0,
  inheritedStructure,
  theme,
  branchIndex,
  isTimelineMode = false,
  extraMarginLeft
}) => {
  const { t } = useI18n();
  const isSelected = selectedId === node.id;
  const isEditing = editingId === node.id;
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(node.text);

  // Sync state value when text updates from outside
  useEffect(() => {
    setInputValue(node.text);
  }, [node.text]);

  // Focus input automatically on edit start
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
    onStartEdit(node.id);
  };

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on collapse badge, let click handle it (don't drag)
    const target = e.target as HTMLElement;
    if (target.closest('.collapse-badge')) {
      return;
    }

    if (isEditing) return;
    if (e.button !== 0) return; // Only allow drag with left mouse button
    
    e.stopPropagation();

    onSelect(node.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.offset?.x || 0;
    const initialY = node.offset?.y || 0;
    let currentOffset: { x: number; y: number } | undefined = node.offset;

    // Capture DOM elements synchronously to avoid React synthetic event nullification in async callbacks
    const draggedCardEl = e.currentTarget as HTMLElement;
    const branchEl = draggedCardEl.closest('.tree-branch');

    let lastTargetId: string | null = null;
    let lastDropType: 'child' | 'before' | 'after' | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Disable pointer-events on the dragged branch only when actual dragging movement starts
      if (branchEl && (branchEl as HTMLElement).style.pointerEvents !== 'none') {
        (branchEl as HTMLElement).style.pointerEvents = 'none';
      }

      // Divide dragging displacement by the canvas zoom factor to maintain cursor-aligned dragging speed
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      
      currentOffset = {
        x: initialX + dx,
        y: initialY + dy
      };
      
      onUpdateOffset(node.id, currentOffset);

      // Drop target detection
      const x = moveEvent.clientX;
      const y = moveEvent.clientY;
      const hoveredEl = document.elementFromPoint(x, y);
      const targetCard = hoveredEl?.closest('.node-card') as HTMLElement;

      // Clear previous hovers
      document.querySelectorAll('.node-card').forEach((el) => {
        el.classList.remove('drop-hover', 'drop-hover-child', 'drop-hover-before', 'drop-hover-after');
      });
      lastTargetId = null;
      lastDropType = null;

      // Stage 1: Overlap Reparenting (drop as child of another node)
      if (targetCard) {
        const targetId = targetCard.getAttribute('data-node-id');
        const isSelf = targetId === node.id;
        const isDescendant = branchEl && branchEl.contains(targetCard);

        if (!isSelf && !isDescendant && targetId) {
          targetCard.classList.add('drop-hover-child');
          lastTargetId = targetId;
          lastDropType = 'child';
        }
      }

      // Stage 2: Sibling Reordering (Y-axis based sibling reordering, active only in auto-layout mode)
      // Stage 2: Sibling Reordering (Center-Y based sibling reordering, active only in auto-layout mode)
      if (!lastTargetId && isAutoLayout && node.id !== 'root' && parent && parent.children && parent.children.length > 1) {
        let siblings = parent.children.filter(c => c.id !== node.id);
        
        // Filter by same side of root in mindmap structure
        if (parent.id === 'root' && (parent.style?.structure || 'logic') === 'mindmap') {
          const isLeftBranch = parent.children.indexOf(node) % 2 === 0;
          siblings = parent.children.filter((c, idx) => {
            if (c.id === node.id) return false;
            const childIsLeft = idx % 2 === 0;
            return childIsLeft === isLeftBranch;
          });
        }

        const siblingData = siblings.map(s => {
          const el = document.querySelector(`[data-node-id="${s.id}"]`) as HTMLElement;
          return {
            id: s.id,
            el,
            rect: el?.getBoundingClientRect()
          };
        }).filter(s => s.el && s.rect);

        if (siblingData.length > 0) {
          // Sort siblings by center Y-coordinate visually
          siblingData.sort((a, b) => (a.rect.top + a.rect.bottom) - (b.rect.top + b.rect.bottom));

          const draggedRect = draggedCardEl.getBoundingClientRect();
          const draggedCenterY = (draggedRect.top + draggedRect.bottom) / 2;

          // Find first sibling whose center is below the dragged card's center
          const beforeSibling = siblingData.find(s => draggedCenterY < (s.rect.top + s.rect.bottom) / 2);
          
          if (beforeSibling) {
            beforeSibling.el.classList.add('drop-hover-before');
            lastTargetId = beforeSibling.id;
            lastDropType = 'before';
          } else {
            // Otherwise, it is at the bottom (after the last sibling)
            const lastSibling = siblingData[siblingData.length - 1];
            lastSibling.el.classList.add('drop-hover-after');
            lastTargetId = lastSibling.id;
            lastDropType = 'after';
          }
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Restore pointer events
      if (branchEl) {
        (branchEl as HTMLElement).style.pointerEvents = '';
      }

      // Clear any remaining hover classes
      document.querySelectorAll('.node-card').forEach((el) => {
        el.classList.remove('drop-hover', 'drop-hover-child', 'drop-hover-before', 'drop-hover-after');
      });

      if (lastTargetId && lastDropType) {
        if (lastDropType === 'child') {
          onReparent(node.id, lastTargetId);
        } else {
          // Check if index actually changed to avoid redundant snap backs and offset clears
          let indexChanged = true;
          if (parent && parent.children) {
            const currentIndex = parent.children.findIndex(c => c.id === node.id);
            const targetIndex = parent.children.findIndex(c => c.id === lastTargetId);
            if (currentIndex !== -1 && targetIndex !== -1) {
              let newIndex = lastDropType === 'before' ? targetIndex : targetIndex + 1;
              if (currentIndex < newIndex) {
                newIndex--; // Account for node being removed first
              }
              if (newIndex === currentIndex) {
                indexChanged = false;
              }
            }
          }

          if (indexChanged) {
            onReorder(node.id, lastTargetId, lastDropType);
          } else {
            onEndDrag(node.id, undefined); // Snap back to its current position
          }
        }
      } else {
        const isSnapBack = isAutoLayout && !isTopLevel;
        if (isSnapBack) {
          onEndDrag(node.id, undefined);
        } else {
          onEndDrag(node.id, currentOffset);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleBlur = () => {
    if (inputValue.trim() !== '') {
      onUpdateText(node.id, inputValue);
    } else {
      setInputValue(node.text); // Rollback
    }
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue(node.text); // Rollback
      onEndEdit();
    }
    e.stopPropagation();
  };

  // Node shape styling classes
  const shapeClass = node.style?.shape 
    ? `node-shape-${node.style.shape}`
    : 'node-shape-rounded'; // default

  const currentShape = node.style?.shape || 'rounded';
  const currentBorderStyle = node.style?.borderStyle || 'solid';
  
  const resolvedColors = getNodeColors(theme, branchIndex, depth, isRoot);
  const effectiveBorderColor = node.style?.borderColor || resolvedColors.borderColor;
  const effectiveBgColor = node.style?.backgroundColor !== undefined ? node.style.backgroundColor : resolvedColors.backgroundColor;

  // Build inline styles based on node properties
  const nodeStyles: React.CSSProperties = {
    color: node.style?.color || (effectiveBgColor === 'transparent' ? effectiveBorderColor : resolvedColors.color),
    fontSize: node.style?.fontSize || (isRoot || depth === 0 ? '22px' : depth === 1 ? '18px' : '14px'),
    fontWeight: node.style?.fontWeight || (isRoot || depth === 0 ? '700' : depth === 1 ? '600' : '500'),
    '--node-border-color': effectiveBorderColor
  } as React.CSSProperties;

  // Apply border styles based on shape and borderStyle
  const borderStyleMap = {
    'solid': 'solid',
    'dashed': 'dashed',
    'long-dashed': 'dashed',
    'dotted': 'dotted'
  };
  const nativeBorderStyle = borderStyleMap[currentBorderStyle as keyof typeof borderStyleMap] || 'solid';

  if (currentShape === 'rounded') {
    nodeStyles.backgroundColor = effectiveBgColor;
    nodeStyles.border = `2px ${nativeBorderStyle} ${effectiveBorderColor}`;
    nodeStyles.backgroundImage = 'none';
  } else if (currentShape === 'rectangle') {
    nodeStyles.backgroundColor = effectiveBgColor;
    nodeStyles.border = `2px ${nativeBorderStyle} ${effectiveBorderColor}`;
    nodeStyles.borderRadius = '4px';
    nodeStyles.backgroundImage = 'none';
  } else if (currentShape === 'circle') {
    nodeStyles.backgroundColor = effectiveBgColor;
    nodeStyles.border = `2px ${nativeBorderStyle} ${effectiveBorderColor}`;
    nodeStyles.backgroundImage = 'none';
  } else if (currentShape === 'diamond') {
    // Diamond always uses SVG polygon background border because clip-path cuts off native borders
    nodeStyles.backgroundColor = 'transparent';
    nodeStyles.border = 'none';
    const strokeColor = isSelected ? 'var(--theme-accent-color)' : effectiveBorderColor;
    nodeStyles.backgroundImage = getDiamondBorderImage(currentBorderStyle, strokeColor, effectiveBgColor, isSelected ? 4 : 2);
  } else if (currentShape === 'underlined') {
    nodeStyles.backgroundColor = effectiveBgColor;
    nodeStyles.border = 'none';
    nodeStyles.borderBottom = `2px ${nativeBorderStyle} ${effectiveBorderColor}`;
    nodeStyles.borderRadius = '0';
    nodeStyles.backgroundImage = 'none';
  }

  // Custom branch translation transform style
  const branchStyle: React.CSSProperties = {
    position: 'relative',
    ...(node.offset ? { transform: `translate(${node.offset.x}px, ${node.offset.y}px)` } : {}),
    ...(extraMarginLeft ? { marginLeft: `${extraMarginLeft}px` } : {})
  };

  const hasChildren = node.children && node.children.length > 0;
  const showChildren = hasChildren && !node.isCollapsed;

  let structure = node.style?.structure || inheritedStructure || 'logic';
  const isTimelineChildNode = parent && parent.style?.structure === 'timeline';
  if (isTimelineMode && !isRoot && !isTimelineChildNode) {
    structure = 'brace';
  }
  
  if (!isRoot) {
    if (isLeft && structure === 'logic') {
      structure = 'logic-left';
    } else if (!isLeft && structure === 'logic-left') {
      structure = 'logic';
    }
  }
  const customStructure = structure;

  // Determine direction dynamically: logic-left overrides to left, logic overrides to right, manual dragging (excluding root) follows offset X, otherwise inherits isLeft
  let nodeIsLeft = isLeft;
  if (customStructure === 'logic-left') {
    nodeIsLeft = true;
  } else if (customStructure === 'logic') {
    nodeIsLeft = false;
  } else if (node.offset && !isRoot) {
    nodeIsLeft = node.offset.x < 0;
  }

  // Brace / fishbone / tree / timeline layouts map to structural modifiers
  const isTimelineChild = parent && parent.style?.structure === 'timeline';
  const nodeIndex = isTimelineChild ? parent.children.findIndex((c) => c.id === node.id) : -1;
  const timelineDirClass = isTimelineChild ? (nodeIndex % 2 === 0 ? 'timeline-up' : 'timeline-down') : '';

  const structureClass = `structure-${structure}`;
  const leftClass = nodeIsLeft ? 'layout-left' : '';
  const boundaryClass = node.boundary ? 'has-boundary' : '';

  const cardDepthClass = (isRoot || depth === 0)
    ? 'node-card-depth-0'
    : depth === 1
      ? 'node-card-depth-1'
      : 'node-card-depth-2';

  const renderNodeCard = () => (
    <div className="node-container">
      <div
        className={`node-card ${cardDepthClass} ${isSelected ? 'selected' : ''} ${shapeClass}`}
        style={nodeStyles}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        data-node-id={node.id}
      >
        <div className="node-card-content-wrapper">
          {/* Embedded Image Preview */}
          {node.image && (
            <div className="node-image-preview-container">
              <img
                src={node.image}
                alt="preview"
                className="node-image-preview"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Main Row: Badges, Text, Note */}
          <div className="node-card-main-row">
            {node.flag && renderFlagIcon(node.flag, t)}
            {node.priority && (
              <span className={`node-badge-priority priority-${node.priority}`} title={`${t("priority")} P${node.priority}`}>
                {node.priority}
              </span>
            )}
            {node.progress !== undefined && (
              <span className="node-badge-progress" title={`${t("taskProgress")} ${node.progress}%`}>
                {renderProgressSvg(node.progress)}
              </span>
            )}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="node-input-editor"
              />
            ) : (
              <span className="node-text">{node.text}</span>
            )}
            {node.note && (
              <span 
                className="node-note-indicator" 
                title={node.note}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNoteEditor?.(node.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer' }}
              >
                <List size={14} />
              </span>
            )}
            {node.link && (
              <a
                href={node.link.startsWith('http') ? node.link : `https://${node.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="node-link-icon"
                title={node.link}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Globe size={13} />
              </a>
            )}
          </div>

          {/* Labels Row */}
          {node.labels && node.labels.length > 0 && (
            <div className="node-card-labels-row">
              {node.labels.map((label, idx) => (
                <span key={idx} className="node-label-tag">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Collapse / Expand Badges */}
        {!isRoot && hasChildren && (
          <div
            className={`collapse-badge ${node.isCollapsed ? 'collapsed' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
          >
            {node.isCollapsed ? '+' : '-'}
          </div>
        )}
      </div>
    </div>
  );

  // If node is root and the structure is mindmap, split children left/right
  if (isRoot && structure === 'mindmap') {
    const leftChildren = node.children.filter((_, idx) => idx % 2 !== 0);
    const rightChildren = node.children.filter((_, idx) => idx % 2 === 0);
    const showLeft = !node.isLeftCollapsed;
    const showRight = !node.isRightCollapsed;

    return (
      <div className={`tree-branch structure-mindmap node-root ${boundaryClass}`} style={branchStyle}>
        <div className="node-row mindmap-root-row">
          {/* Left sub-branches */}
          {showLeft && leftChildren.length > 0 && (
            <div className="tree-children layout-left">
              {leftChildren.map((child) => {
                const idx = node.children.findIndex((c) => c.id === child.id);
                return (
                  <MindMapNode
                    key={child.id}
                    node={child}
                    parent={node}
                    selectedId={selectedId}
                    editingId={editingId}
                    zoom={zoom}
                    isAutoLayout={isAutoLayout}
                    isTopLevel={false}
                    isLeft={true}
                    onSelect={onSelect}
                    onStartEdit={onStartEdit}
                    onEndEdit={onEndEdit}
                    onUpdateText={onUpdateText}
                    onToggleCollapse={onToggleCollapse}
                    onUpdateOffset={onUpdateOffset}
                    onEndDrag={onEndDrag}
                    onReparent={onReparent}
                    onReorder={onReorder}
                    onUpdateData={onUpdateData}
                    onOpenNoteEditor={onOpenNoteEditor}
                    isRoot={false}
                    depth={depth + 1}
                    inheritedStructure={structure}
                    theme={theme}
                    branchIndex={idx}
                  />
                );
              })}
            </div>
          )}

          {/* Center Root Card */}
          {renderNodeCard()}

          {/* Right sub-branches */}
          {showRight && rightChildren.length > 0 && (
            <div className="tree-children layout-right">
              {rightChildren.map((child) => {
                const idx = node.children.findIndex((c) => c.id === child.id);
                return (
                  <MindMapNode
                    key={child.id}
                    node={child}
                    parent={node}
                    selectedId={selectedId}
                    editingId={editingId}
                    zoom={zoom}
                    isAutoLayout={isAutoLayout}
                    isTopLevel={false}
                    isLeft={false}
                    onSelect={onSelect}
                    onStartEdit={onStartEdit}
                    onEndEdit={onEndEdit}
                    onUpdateText={onUpdateText}
                    onToggleCollapse={onToggleCollapse}
                    onUpdateOffset={onUpdateOffset}
                    onEndDrag={onEndDrag}
                    onReparent={onReparent}
                    onReorder={onReorder}
                    onUpdateData={onUpdateData}
                    onOpenNoteEditor={onOpenNoteEditor}
                    isRoot={false}
                    depth={depth + 1}
                    inheritedStructure={structure}
                    theme={theme}
                    branchIndex={idx}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard recursive rendering for other structures or non-root nodes
  return (
    <div className={`tree-branch ${structureClass} ${leftClass} ${isRoot ? 'node-root' : ''} ${boundaryClass} ${timelineDirClass}`} style={branchStyle}>
      <div className="node-row">
        {renderNodeCard()}

        {/* Recursive Children rendering */}
        {showChildren && (
          <div className="tree-children">
            {node.children.map((child, idx) => {
              const childBranchIndex = (isRoot || depth === 0) ? idx : branchIndex;
              
              let extraMarginLeft: number | undefined = undefined;
              if (structure === 'timeline') {
                // Calculate dynamic positioning for timeline milestones based on previous milestone descendants spans
                const W = node.children.map(m => estimateNodeWidth(m));
                const spans = node.children.map(m => calculateDescendantSpan(m));
                const G = 80; // default CSS gap between milestones
                const S = 60; // safety gap to prevent overlaps between adjacent same-side branches
                
                const pos: number[] = [];
                pos[0] = 0;
                if (node.children.length > 1) {
                  pos[1] = W[0] + G;
                }
                for (let k = 2; k <= idx; k++) {
                  const defaultNext = pos[k - 1] + W[k - 1] + G;
                  const sameSideConstraint = pos[k - 2] + spans[k - 2] + S;
                  pos[k] = Math.max(defaultNext, sameSideConstraint);
                }
                
                if (idx >= 2) {
                  const defaultNext = pos[idx - 1] + W[idx - 1] + G;
                  const extra = pos[idx] - defaultNext;
                  if (extra > 0) {
                    extraMarginLeft = extra;
                  }
                }
              }

              return (
                <MindMapNode
                  key={child.id}
                  node={child}
                  parent={node}
                  selectedId={selectedId}
                  editingId={editingId}
                  zoom={zoom}
                  isAutoLayout={isAutoLayout}
                  isTopLevel={false}
                  isLeft={nodeIsLeft}
                  onSelect={onSelect}
                  onStartEdit={onStartEdit}
                  onEndEdit={onEndEdit}
                  onUpdateText={onUpdateText}
                  onToggleCollapse={onToggleCollapse}
                  onUpdateOffset={onUpdateOffset}
                  onEndDrag={onEndDrag}
                  onReparent={onReparent}
                  onReorder={onReorder}
                  onUpdateData={onUpdateData}
                  onOpenNoteEditor={onOpenNoteEditor}
                  isRoot={child.id === 'root'}
                  depth={depth + 1}
                  inheritedStructure={structure === 'timeline' ? 'brace' : structure}
                  theme={theme}
                  branchIndex={childBranchIndex}
                  isTimelineMode={isTimelineMode}
                  extraMarginLeft={extraMarginLeft}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default MindMapNode;
