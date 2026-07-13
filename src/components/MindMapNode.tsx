import React, { useEffect, useRef, useState } from 'react';
import { StickyNote } from 'lucide-react';
import type { MindMapNode as MindMapNodeType } from '../types/mindmap';

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
  isRoot?: boolean;
}

const renderProgressSvg = (progress: number) => {
  const radius = 6;
  const circumference = 2 * Math.PI * radius; // ~37.7
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <svg width="16" height="16" className="progress-svg" style={{ display: 'block' }}>
      <circle cx="8" cy="8" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
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
  isRoot = false
}) => {
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
  const effectiveBorderColor = node.style?.borderColor || (isRoot ? 'var(--theme-root-border)' : 'var(--theme-node-default-border)');
  const effectiveBgColor = node.style?.backgroundColor || (isRoot ? 'var(--theme-root-background)' : 'var(--theme-node-default-background)');

  // Build inline styles based on node properties
  const nodeStyles: React.CSSProperties = {
    color: node.style?.color || (isRoot ? 'var(--theme-root-color)' : 'var(--theme-node-default-color)'),
    fontSize: node.style?.fontSize || (isRoot ? '18px' : '14px'),
    fontWeight: node.style?.fontWeight || (isRoot ? '700' : '500'),
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
  const branchStyle: React.CSSProperties = node.offset ? {
    transform: `translate(${node.offset.x}px, ${node.offset.y}px)`,
    position: 'relative'
  } : {
    position: 'relative'
  };

  const hasChildren = node.children && node.children.length > 0;
  const showChildren = hasChildren && !node.isCollapsed;

  let structure = node.style?.structure || 'logic';
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

  const renderNodeCard = () => (
    <div className="node-container">
      <div
        className={`node-card ${isSelected ? 'selected' : ''} ${shapeClass}`}
        style={nodeStyles}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        data-node-id={node.id}
      >
        <div className="node-card-content-wrapper">
          {/* Main Row: Badges, Text, Note */}
          <div className="node-card-main-row">
            {node.priority && (
              <span className={`node-badge-priority priority-${node.priority}`} title={`優先級 P${node.priority}`}>
                {node.priority}
              </span>
            )}
            {node.progress !== undefined && (
              <span className="node-badge-progress" title={`任務進度 ${node.progress}%`}>
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
              <span className="node-note-indicator" title={node.note}>
                <StickyNote size={13} />
              </span>
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
        {isRoot && structure === 'mindmap' ? (
          <>
            {/* Left side badge */}
            {node.children.filter((_, idx) => idx % 2 === 0).length > 0 && (
              <div
                className={`collapse-badge root-left-badge ${node.isLeftCollapsed ? 'collapsed' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(node.id, 'left');
                }}
                style={{
                  right: 'auto',
                  left: '-10px'
                }}
              >
                {node.isLeftCollapsed ? '+' : '-'}
              </div>
            )}
            {/* Right side badge */}
            {node.children.filter((_, idx) => idx % 2 !== 0).length > 0 && (
              <div
                className={`collapse-badge root-right-badge ${node.isRightCollapsed ? 'collapsed' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(node.id, 'right');
                }}
                style={{
                  right: '-10px'
                }}
              >
                {node.isRightCollapsed ? '+' : '-'}
              </div>
            )}
          </>
        ) : (
          hasChildren && (
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
          )
        )}
      </div>
    </div>
  );

  // If node is root and the structure is mindmap, split children left/right
  if (isRoot && structure === 'mindmap') {
    const leftChildren = node.children.filter((_, idx) => idx % 2 === 0);
    const rightChildren = node.children.filter((_, idx) => idx % 2 !== 0);
    const showLeft = !node.isLeftCollapsed;
    const showRight = !node.isRightCollapsed;

    return (
      <div className={`tree-branch structure-mindmap node-root ${boundaryClass}`} style={branchStyle}>
        <div className="node-row mindmap-root-row">
          {/* Left sub-branches */}
          {showLeft && leftChildren.length > 0 && (
            <div className="tree-children layout-left">
              {leftChildren.map((child) => (
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
                  isRoot={false}
                />
              ))}
            </div>
          )}

          {/* Center Root Card */}
          {renderNodeCard()}

          {/* Right sub-branches */}
          {showRight && rightChildren.length > 0 && (
            <div className="tree-children layout-right">
              {rightChildren.map((child) => (
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
                  isRoot={false}
                />
              ))}
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
            {node.children.map((child) => (
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
                isRoot={child.id === 'root'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default MindMapNode;
