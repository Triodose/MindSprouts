import React, { useEffect, useState, useRef } from 'react';
import type { MindMapNode, BoundaryStyle, SummaryPosition } from '../types/mindmap';
import { findParent } from '../utils/treeUtils';
import { useI18n } from '../context/I18nContext';

interface BoundaryDrawData {
  id: string;
  rect: { x: number; y: number; width: number; height: number };
  style: BoundaryStyle;
}

interface SummaryBrace {
  id: string;
  path: string;
  color: string;
}

interface SVGConnectionsProps {
  tree: MindMapNode;
  themeLineColor: string;
  themeBranchColors?: string[];
  zoom: number;
  redrawTrigger: any;
  selectedRelId?: string | null;
  onSelectRel?: (id: string | null) => void;
  onUpdateRelText?: (id: string, text: string) => void;
  selectedNodeId?: string | null;
  onUpdateSummaryPositions?: (positions: SummaryPosition[]) => void;
  onSelectNode?: (id: string | null) => void;
}

interface ConnectionLine {
  id: string;
  path: string;
  color: string;
  fill?: string;
  strokeWidth?: number;
}

interface RelationshipLine {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  text: string;
  isSelected: boolean;
}

interface RelationshipLabelProps {
  rel: RelationshipLine;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateText?: (id: string, text: string) => void;
}

const RelationshipLabelCard: React.FC<RelationshipLabelProps> = ({
  rel,
  isSelected,
  onSelect,
  onUpdateText
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(rel.text);

  useEffect(() => {
    setInputValue(rel.text);
  }, [rel.text]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdateText?.(rel.id, inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onUpdateText?.(rel.id, inputValue.trim());
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(rel.text);
    }
  };

  return (
    <div
      className={`relationship-label-card ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: `${rel.labelX}px`,
        top: `${rel.labelY}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        pointerEvents: 'auto'
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="relationship-label-input"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{rel.text || t('doubleClickToEditRel')}</span>
      )}
    </div>
  );
};

const findNodeById = (currNode: MindMapNode, id: string): MindMapNode | null => {
  if (currNode.id === id) return currNode;
  if (currNode.children) {
    for (const child of currNode.children) {
      const res = findNodeById(child, id);
      if (res) return res;
    }
  }
  return null;
};

export const SVGConnections: React.FC<SVGConnectionsProps> = ({
  tree,
  themeLineColor,
  themeBranchColors,
  zoom,
  redrawTrigger,
  selectedRelId = null,
  onSelectRel,
  onUpdateRelText,
  selectedNodeId = null,
  onUpdateSummaryPositions,
  onSelectNode
}) => {
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const [relLines, setRelLines] = useState<RelationshipLine[]>([]);
  const [boundaries, setBoundaries] = useState<BoundaryDrawData[]>([]);
  const [braces, setBraces] = useState<SummaryBrace[]>([]);
  const containerRef = useRef<SVGSVGElement>(null);
  const previousPositionsRef = useRef<string>('');

  useEffect(() => {
    const calculateConnections = () => {
      const svgElement = containerRef.current;
      if (!svgElement) return;

      const treeContainer = svgElement.closest('.tree-container');
      if (!treeContainer) return;

      const treeRect = treeContainer.getBoundingClientRect();
      const newLines: ConnectionLine[] = [];
      const newBoundaries: BoundaryDrawData[] = [];

      const getUnzoomedCoords = (rect: DOMRect) => {
        return {
          left: (rect.left - treeRect.left) / zoom,
          top: (rect.top - treeRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
          right: (rect.right - treeRect.left) / zoom,
          bottom: (rect.bottom - treeRect.top) / zoom
        };
      };

      // 0. Realign first-level nodes vertically if they push past the root card top/bottom borders to prevent crossing
      const rootNode = tree?.children?.find((c: MindMapNode) => c.id === 'root');
      const parentEl = rootNode ? treeContainer.querySelector(`[data-node-id="${rootNode.id}"]`) : null;
      if (rootNode && rootNode.children && parentEl) {
        const pRect = parentEl.getBoundingClientRect();
        const pCoords = getUnzoomedCoords(pRect);

        // Reset all custom margins on first-level branches first to measure natural layout
        rootNode.children.forEach(child => {
          const cardEl = treeContainer.querySelector(`[data-node-id="${child.id}"]`);
          const branchEl = cardEl?.closest('.tree-branch') as HTMLElement;
          if (branchEl) {
            branchEl.style.transition = 'none'; // Temporarily disable margin transition
            branchEl.style.marginTop = '';
          }
        });

        // Force a single reflow for the reset
        parentEl.getBoundingClientRect();

        // Only apply adjustment in mindmap layout structure
        const structure = rootNode.style?.structure || 'logic';
        if (structure === 'mindmap') {
          const leftChildren = rootNode.children.filter((_, idx) => idx % 2 !== 0);
          const rightChildren = rootNode.children.filter((_, idx) => idx % 2 === 0);

          const adjustSide = (siblings: MindMapNode[]) => {
            const M = siblings.length;
            siblings.forEach((child, k) => {
              let ptType = 'center';
              if (M === 1) {
                ptType = 'center';
              } else if (M === 2) {
                ptType = k === 0 ? 'top' : 'center';
              } else if (M === 3) {
                ptType = k === 0 ? 'top' : k === 1 ? 'center' : 'bottom';
              } else {
                if (k === 0) ptType = 'top';
                else if (k === 1) ptType = 'center';
                else ptType = 'bottom';
              }

              const cardEl = treeContainer.querySelector(`[data-node-id="${child.id}"]`);
              if (cardEl) {
                const cRect = cardEl.getBoundingClientRect();
                const cCoords = getUnzoomedCoords(cRect);
                if (cCoords) {
                  const childCenterY = cCoords.top + cCoords.height / 2;

                  if (ptType === 'bottom') {
                    const targetY = pCoords.bottom + 16;
                    if (childCenterY < targetY) {
                      const branchEl = cardEl.closest('.tree-branch') as HTMLElement;
                      if (branchEl) {
                        // Double the diff to compensate for flex container centering (justify-content: center)
                        const diff = (targetY - childCenterY) * 2;
                        branchEl.style.transition = 'none';
                        branchEl.style.marginTop = `${diff}px`;
                        // Force a reflow for this branch
                        branchEl.getBoundingClientRect();
                      }
                    }
                  } else if (ptType === 'top') {
                    const targetY = pCoords.top - 16;
                    if (childCenterY > targetY) {
                      const branchEl = cardEl.closest('.tree-branch') as HTMLElement;
                      if (branchEl) {
                        // Double the diff to compensate for flex container centering (justify-content: center)
                        const diff = (childCenterY - targetY) * 2;
                        branchEl.style.transition = 'none';
                        branchEl.style.marginTop = `-${diff}px`;
                        // Force a reflow for this branch
                        branchEl.getBoundingClientRect();
                      }
                    }
                  }
                }
              }
            });
          };

          adjustSide(leftChildren);
          adjustSide(rightChildren);
        }

        // Restore transitions after layout settles
        setTimeout(() => {
          rootNode.children?.forEach(child => {
            const cardEl = treeContainer.querySelector(`[data-node-id="${child.id}"]`);
            const branchEl = cardEl?.closest('.tree-branch') as HTMLElement;
            if (branchEl) {
              branchEl.style.transition = '';
            }
          });
        }, 50);
      }

      // 1. Traverse Hierarchical Branches
      const isTimelineMode = rootNode?.style?.structure === 'timeline';

      const traverse = (
        node: MindMapNode, 
        branchIndex: number = -1, 
        isLeft: boolean = false, 
        inheritedStructure: string = 'logic'
      ) => {
        if (node.id === 'virtual-root') {
          node.children.forEach((child) => traverse(child, -1, false, inheritedStructure));
          return;
        }

        if (node.isCollapsed || !node.children || node.children.length === 0) return;

        const parentEl = treeContainer.querySelector(`[data-node-id="${node.id}"]`);
        if (!parentEl) return;

        const parentRect = parentEl.getBoundingClientRect();
        const pCoords = getUnzoomedCoords(parentRect);
        
        const isRootNode = node.id === 'root';
        let structure = node.style?.structure || inheritedStructure;
        const isMilestoneNode = findParent(tree, node.id)?.id === 'root';
        if (isTimelineMode && !isRootNode && !isMilestoneNode) {
          structure = 'brace';
        }
        if (!isRootNode) {
          if (isLeft && structure === 'logic') {
            structure = 'logic-left';
          } else if (!isLeft && structure === 'logic-left') {
            structure = 'logic';
          }
        }

        node.children.forEach((child, idx) => {
          const childEl = treeContainer.querySelector(`[data-node-id="${child.id}"]`);
          if (!childEl) return;

          const childRect = childEl.getBoundingClientRect();
          const cCoords = getUnzoomedCoords(childRect);

          const isLeftGeom = structure === 'brace'
            ? isLeft
            : (cCoords.left + cCoords.width / 2) < (pCoords.left + pCoords.width / 2);

          let startX = 0;
          let startY = 0;
          let endX = 0;
          let endY = 0;

          const grandparent = findParent(tree, node.id);
          const isParentTimelineMilestone = grandparent && grandparent.style?.structure === 'timeline';
          const milestoneIndex = isParentTimelineMilestone ? grandparent.children.findIndex((c: MindMapNode) => c.id === node.id) : -1;
          const isTimelineUp = isParentTimelineMilestone && milestoneIndex % 2 === 0;
          const isTimelineDown = isParentTimelineMilestone && milestoneIndex % 2 !== 0;

          if (structure === 'org') {
            startX = pCoords.left + pCoords.width / 2;
            startY = pCoords.bottom;
            endX = cCoords.left + cCoords.width / 2;
            endY = cCoords.top;
          } else if (structure === 'tree') {
            startX = pCoords.left + 20;
            startY = pCoords.bottom;
            endX = cCoords.left;
            endY = cCoords.top + cCoords.height / 2;
          } else if (isTimelineUp) {
            startX = pCoords.left + pCoords.width / 2;
            startY = pCoords.top;
            endX = (cCoords.left + cCoords.width / 2 < startX) ? cCoords.right : cCoords.left;
            endY = cCoords.top + cCoords.height / 2;
          } else if (isTimelineDown) {
            startX = pCoords.left + pCoords.width / 2;
            startY = pCoords.bottom;
            endX = (cCoords.left + cCoords.width / 2 < startX) ? cCoords.right : cCoords.left;
            endY = cCoords.top + cCoords.height / 2;
          } else if (isRootNode && structure === 'mindmap') {
            const childIdx = node.children.findIndex(c => c.id === child.id);
            const isLeftScreen = childIdx % 2 !== 0;

            const leftChildren = node.children.filter((_, idx) => idx % 2 !== 0);
            const rightChildren = node.children.filter((_, idx) => idx % 2 === 0);

            const k = isLeftScreen 
              ? leftChildren.findIndex(c => c.id === child.id)
              : rightChildren.findIndex(c => c.id === child.id);

            const M = isLeftScreen ? leftChildren.length : rightChildren.length;
            
            // Priority list of connection points (strictly sorted from top to bottom based on M)
            let pt = { type: 'center', i: 4 };
            if (M === 1) {
              pt = { type: 'center', i: 4 };
            } else if (M === 2) {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else pt = { type: 'center', i: 4 };
            } else if (M === 3) {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else if (k === 1) pt = { type: 'center', i: 4 };
              else pt = { type: 'bottom', i: isLeftScreen ? 3 : 5 };
            } else if (M === 4) {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else if (k === 1) pt = { type: 'center', i: 4 };
              else if (k === 2) pt = { type: 'bottom', i: isLeftScreen ? 2 : 6 };
              else pt = { type: 'bottom', i: isLeftScreen ? 3 : 5 };
            } else if (M === 5) {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else if (k === 1) pt = { type: 'top', i: isLeftScreen ? 2 : 6 };
              else if (k === 2) pt = { type: 'center', i: 4 };
              else if (k === 3) pt = { type: 'bottom', i: isLeftScreen ? 2 : 6 };
              else pt = { type: 'bottom', i: isLeftScreen ? 3 : 5 };
            } else if (M === 6) {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else if (k === 1) pt = { type: 'top', i: isLeftScreen ? 2 : 6 };
              else if (k === 2) pt = { type: 'top', i: isLeftScreen ? 1 : 7 };
              else if (k === 3) pt = { type: 'center', i: 4 };
              else if (k === 4) pt = { type: 'bottom', i: isLeftScreen ? 2 : 6 };
              else pt = { type: 'bottom', i: isLeftScreen ? 3 : 5 };
            } else {
              if (k === 0) pt = { type: 'top', i: isLeftScreen ? 3 : 5 };
              else if (k === 1) pt = { type: 'top', i: isLeftScreen ? 2 : 6 };
              else if (k === 2) pt = { type: 'top', i: isLeftScreen ? 1 : 7 };
              else if (k === 3) pt = { type: 'center', i: 4 };
              else if (k === 4) pt = { type: 'bottom', i: isLeftScreen ? 1 : 7 };
              else if (k === 5) pt = { type: 'bottom', i: isLeftScreen ? 2 : 6 };
              else if (k === 6) pt = { type: 'bottom', i: isLeftScreen ? 3 : 5 };
              else pt = { type: 'center', i: 4 };
            }
            
            if (pt.type === 'center') {
              startX = isLeftScreen ? pCoords.left : pCoords.right;
              startY = pCoords.top + pCoords.height / 2;
            } else if (pt.type === 'top') {
              startX = pCoords.left + (pCoords.width * pt.i) / 8;
              startY = pCoords.top;
            } else {
              startX = pCoords.left + (pCoords.width * pt.i) / 8;
              startY = pCoords.bottom;
            }
            
            if (isLeftScreen) {
              endX = cCoords.right;
              endY = cCoords.top + cCoords.height / 2;
            } else {
              endX = cCoords.left;
              endY = cCoords.top + cCoords.height / 2;
            }
          } else if (isLeftGeom) {
            startX = pCoords.left;
            startY = pCoords.top + pCoords.height / 2;
            endX = cCoords.right;
            endY = cCoords.top + cCoords.height / 2;
          } else {
            startX = pCoords.right;
            startY = pCoords.top + pCoords.height / 2;
            endX = cCoords.left;
            endY = cCoords.top + cCoords.height / 2;
          }

          let path = '';
          if (structure === 'org') {
            const controlYOffset = Math.min(100, Math.max(30, (endY - startY) * 0.5));
            const cp1x = startX;
            const cp1y = startY + controlYOffset;
            const cp2x = endX;
            const cp2y = endY - controlYOffset;
            path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          } else if (node.style?.structure === 'timeline') {
            // Straight horizontal line for main timeline axis
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else if (isTimelineUp || isTimelineDown) {
            // Slanted diagonal elbow connection for timeline milestone branches
            const maxSlant = Math.min(30, Math.abs(endX - startX), Math.abs(endY - startY));
            const directionSign = (endX > startX) ? 1 : -1;
            const actualSlantX = maxSlant * directionSign;
            const slantYOffset = maxSlant * (isTimelineUp ? -1 : 1);
            const branchY = endY - slantYOffset;
            path = `M ${startX} ${startY} V ${branchY} L ${startX + actualSlantX} ${endY} H ${endX}`;
          } else if (structure === 'tree') {
            // Vertical-first elbow connection for tree
            path = `M ${startX} ${startY} V ${endY} H ${endX}`;
          } else if (structure === 'fishbone') {
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else if (structure === 'brace') {
            if (node.children.length === 1) {
              path = `M ${startX} ${startY} H ${endX}`;
            } else {
              // Gather minY and maxY of all children to construct brace
              let minY = Infinity;
              let maxY = -Infinity;
              node.children.forEach((c) => {
                const cEl = treeContainer.querySelector(`[data-node-id="${c.id}"]`);
                if (cEl) {
                  const cRect = cEl.getBoundingClientRect();
                  const coords = getUnzoomedCoords(cRect);
                  const childCenterY = coords.top + coords.height / 2;
                  if (childCenterY < minY) minY = childCenterY;
                  if (childCenterY > maxY) maxY = childCenterY;
                }
              });

              if (minY === Infinity || maxY === -Infinity) {
                path = `M ${startX} ${startY} H ${endX}`;
              } else {
                const gap = Math.abs(endX - startX);
                const offsetTip = Math.min(6, gap * 0.15);
                const offsetBack = Math.min(16, gap * 0.4);
                const offsetCorner = Math.min(24, gap * 0.6);
                
                const dir = isLeftGeom ? -1 : 1;
                const tipX = startX + offsetTip * dir;
                const backX = startX + offsetBack * dir;
                const cornerX = startX + offsetCorner * dir;
                
                const R = Math.min(8, Math.abs(maxY - minY) / 4);
                const cuspY = Math.max(minY + R, Math.min(maxY - R, startY));

                const isTopmost = Math.abs(endY - minY) < 1;
                const isBottommost = Math.abs(endY - maxY) < 1;
                const childStartX = (isTopmost || isBottommost) ? cornerX : backX;

                const activeLineStyle = node.style?.lineStyle || 'curve';

                if (activeLineStyle === 'tapered') {
                  const isTopLevelBranch = node.id === 'root';
                  const startW = isTopLevelBranch ? 18 : 10;
                  const endW = 1.2;

                  const parentPath = `M ${startX} ${startY - startW/2} H ${tipX} V ${startY + startW/2} H ${startX} Z`;
                  
                  const upperBranch = `M ${tipX} ${cuspY - startW/2} ` +
                                      `C ${backX} ${cuspY - startW/2}, ${backX} ${minY - endW/2}, ${cornerX} ${minY - endW/2} ` +
                                      `L ${cornerX} ${minY + endW/2} ` +
                                      `C ${backX} ${minY + endW/2}, ${backX} ${cuspY + startW/2}, ${tipX} ${cuspY + startW/2} ` +
                                      `Z`;
                                      
                  const lowerBranch = `M ${tipX} ${cuspY - startW/2} ` +
                                      `C ${backX} ${cuspY - startW/2}, ${backX} ${maxY - endW/2}, ${cornerX} ${maxY - endW/2} ` +
                                      `L ${cornerX} ${maxY + endW/2} ` +
                                      `C ${backX} ${maxY + endW/2}, ${backX} ${cuspY + startW/2}, ${tipX} ${cuspY + startW/2} ` +
                                      `Z`;
                                      
                  // Calculate exact X coordinate on the Bezier curve for the current child's endY
                  let exactStartX = cornerX;
                  if (endY <= cuspY) {
                    const denom = cuspY - minY;
                    const t = denom > 0.1 ? (cuspY - endY) / denom : 0;
                    const mt = 1 - t;
                    exactStartX = mt * mt * mt * tipX + 3 * mt * mt * t * backX + 3 * mt * t * t * backX + t * t * t * cornerX;
                  } else {
                    const denom = maxY - cuspY;
                    const t = denom > 0.1 ? (endY - cuspY) / denom : 0;
                    const mt = 1 - t;
                    exactStartX = mt * mt * mt * tipX + 3 * mt * mt * t * backX + 3 * mt * t * t * backX + t * t * t * cornerX;
                  }

                  const childPath = `M ${exactStartX} ${endY - endW/2} H ${endX} V ${endY + endW/2} H ${exactStartX} Z`;

                  if (idx === 0) {
                    path = `${parentPath} ${upperBranch} ${lowerBranch} ${childPath}`;
                  } else {
                    path = childPath;
                  }
                } else {
                  if (idx === 0) {
                    let parentLine = '';
                    if (Math.abs(startY - cuspY) < 2) {
                      parentLine = `M ${startX} ${startY} H ${tipX}`;
                    } else {
                      const cpX = startX + offsetTip * dir * 0.5;
                      parentLine = `M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${cuspY}, ${tipX} ${cuspY}`;
                    }

                    const bracePath = `${parentLine} ` +
                                      `M ${tipX} ${cuspY} ` +
                                      `Q ${backX} ${cuspY}, ${backX} ${cuspY - R} ` +
                                      `V ${minY + R} ` +
                                      `Q ${backX} ${minY}, ${cornerX} ${minY} ` +
                                      `M ${tipX} ${cuspY} ` +
                                      `Q ${backX} ${cuspY}, ${backX} ${cuspY + R} ` +
                                      `V ${maxY - R} ` +
                                      `Q ${backX} ${maxY}, ${cornerX} ${maxY}`;
                    
                    path = `${bracePath} M ${childStartX} ${endY} H ${endX}`;
                  } else {
                    path = `M ${childStartX} ${endY} H ${endX}`;
                  }
                }
              }
            }
          } else {
            const lineStyle = node.style?.lineStyle || 'curve';
            if (lineStyle === 'straight') {
              path = `M ${startX} ${startY} L ${endX} ${endY}`;
            } else if (lineStyle === 'tapered') {
              const controlXOffset = Math.min(100, Math.max(30, Math.abs(endX - startX) * 0.5));
              const sign = isLeftGeom ? -1 : 1;
              const isTopLevelBranch = node.id === 'root';
              const startW = isTopLevelBranch ? 18 : 10;
              const endW = 1.2;
              
              // Check if starting horizontally (connecting to top/bottom edge)
              const isTopOrBottomEdge = (startY === pCoords.top || startY === pCoords.bottom);
              
              if (isTopOrBottomEdge) {
                const isTopEdge = (startY === pCoords.top);
                const controlYOffset = Math.min(100, Math.max(30, Math.abs(endY - startY) * 0.5));
                
                const startX_top = (endX > startX) ? (startX - startW / 2) : (startX + startW / 2);
                const startX_bottom = (endX > startX) ? (startX + startW / 2) : (startX - startW / 2);
                
                const cp1x_top = startX_top;
                const cp1y_top = isTopEdge ? (startY - controlYOffset) : (startY + controlYOffset);
                const cp2x_top = endX - controlXOffset * sign;
                const cp2y_top = endY - endW / 2;
                
                const cp2x_bottom = endX - controlXOffset * sign;
                const cp2y_bottom = endY + endW / 2;
                const cp1x_bottom = startX_bottom;
                const cp1y_bottom = isTopEdge ? (startY - controlYOffset) : (startY + controlYOffset);
                
                path = `M ${startX_top} ${startY} ` +
                       `C ${cp1x_top} ${cp1y_top}, ${cp2x_top} ${cp2y_top}, ${endX} ${endY - endW / 2} ` +
                       `L ${endX} ${endY + endW / 2} ` +
                       `C ${cp2x_bottom} ${cp2y_bottom}, ${cp1x_bottom} ${cp1y_bottom}, ${startX_bottom} ${startY} ` +
                       `Z`;
              } else {
                const cp1x_top = startX + controlXOffset * sign;
                const cp1y_top = startY - startW / 2;
                const cp2x_top = endX - controlXOffset * sign;
                const cp2y_top = endY - endW / 2;
                
                const cp2x_bottom = endX - controlXOffset * sign;
                const cp2y_bottom = endY + endW / 2;
                const cp1x_bottom = startX + controlXOffset * sign;
                const cp1y_bottom = startY + startW / 2;
                
                path = `M ${startX} ${startY - startW / 2} ` +
                       `C ${cp1x_top} ${cp1y_top}, ${cp2x_top} ${cp2y_top}, ${endX} ${endY - endW / 2} ` +
                       `L ${endX} ${endY + endW / 2} ` +
                       `C ${cp2x_bottom} ${cp2y_bottom}, ${cp1x_bottom} ${cp1y_bottom}, ${startX} ${startY + startW / 2} ` +
                       `Z`;
              }
            } else {
              const controlXOffset = Math.min(100, Math.max(30, Math.abs(endX - startX) * 0.5));
              const sign = isLeftGeom ? -1 : 1;
              
              // Check if starting horizontally (connecting to top/bottom edge)
              const isTopOrBottomEdge = (startY === pCoords.top || startY === pCoords.bottom);
              
              if (isTopOrBottomEdge) {
                const isTopEdge = (startY === pCoords.top);
                const controlYOffset = Math.min(100, Math.max(30, Math.abs(endY - startY) * 0.5));
                
                const cp1x = startX;
                const cp1y = isTopEdge ? (startY - controlYOffset) : (startY + controlYOffset);
                const cp2x = endX - controlXOffset * sign;
                const cp2y = endY;
                
                path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
              } else {
                const cp1x = startX + controlXOffset * sign;
                const cp1y = startY;
                const cp2x = endX - controlXOffset * sign;
                const cp2y = endY;
                path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
              }
            }
          }

          let lineBranchIndex = branchIndex;
          if (node.id === 'root') {
            lineBranchIndex = idx;
          }

          const strokeColor = (themeBranchColors && themeBranchColors.length > 0 && lineBranchIndex >= 0 && !isTimelineMode)
            ? themeBranchColors[lineBranchIndex % themeBranchColors.length]
            : themeLineColor;

          const activeLineStyle = node.style?.lineStyle || 'curve';
          newLines.push({
            id: `${node.id}-${child.id}`,
            path,
            color: strokeColor,
            fill: activeLineStyle === 'tapered' ? strokeColor : 'none',
            strokeWidth: activeLineStyle === 'tapered' ? 0.5 : 2.5
          });

          let childIsLeft = isLeft;
          if (isRootNode) {
            if (structure === 'logic-left') {
              childIsLeft = true;
            } else if (structure === 'logic') {
              childIsLeft = false;
            } else if (structure === 'mindmap') {
              childIsLeft = (cCoords.left + cCoords.width / 2 < pCoords.left + pCoords.width / 2);
            }
          } else {
            if (structure === 'logic-left') {
              childIsLeft = true;
            } else if (structure === 'logic') {
              childIsLeft = false;
            }
          }

          traverse(child, lineBranchIndex, childIsLeft, structure === 'timeline' ? 'brace' : structure);
        });
      };

      traverse(tree, -1, false, tree.style?.structure || 'logic');
      setLines(newLines);

      // 2. Calculate Subtree Boundaries (Bottom-up recursive card-union)
      const boundariesList: { id: string; style: BoundaryStyle; depth: number; node: MindMapNode }[] = [];
      
      const getNodeDepth = (currNode: MindMapNode, targetId: string, depth = 0): number => {
        if (currNode.id === targetId) return depth;
        if (!currNode.children) return -1;
        for (const child of currNode.children) {
          const d = getNodeDepth(child, targetId, depth + 1);
          if (d !== -1) return d;
        }
        return -1;
      };

      const isDescendant = (parentNode: MindMapNode, childId: string): boolean => {
        if (!parentNode.children) return false;
        return parentNode.children.some((c) => c.id === childId || isDescendant(c, childId));
      };

      const getVisibleDescendants = (currNode: MindMapNode): string[] => {
        const ids = [currNode.id];
        if (currNode.isCollapsed) return ids;
        if (!currNode.children) return ids;
        currNode.children.forEach((c) => {
          ids.push(...getVisibleDescendants(c));
        });
        return ids;
      };

      const collectBoundaries = (currNode: MindMapNode) => {
        if (currNode.id === 'virtual-root') {
          if (currNode.children) currNode.children.forEach(collectBoundaries);
          return;
        }
        if (currNode.boundary) {
          const depth = getNodeDepth(tree, currNode.id);
          boundariesList.push({
            id: currNode.id,
            style: currNode.boundary,
            depth,
            node: currNode
          });
        }
        if (currNode.children) currNode.children.forEach(collectBoundaries);
      };

      collectBoundaries(tree);

      // Sort boundaries by depth descending (deeper/leaves first)
      boundariesList.sort((a, b) => b.depth - a.depth);

      const finalizedBoundaries = new Map<string, { x: number; y: number; width: number; height: number }>();

      boundariesList.forEach((b) => {
        const visibleIds = getVisibleDescendants(b.node);
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        visibleIds.forEach((nid) => {
          const cardEl = treeContainer.querySelector(`[data-node-id="${nid}"]`);
          if (cardEl) {
            const cardRect = cardEl.getBoundingClientRect();
            const unzoomed = getUnzoomedCoords(cardRect);
            minX = Math.min(minX, unzoomed.left);
            minY = Math.min(minY, unzoomed.top);
            maxX = Math.max(maxX, unzoomed.right);
            maxY = Math.max(maxY, unzoomed.bottom);
          }
        });

        if (minX === Infinity) return;

        const basePadding = 12;
        const hasTitle = !!b.style.title;
        const topPadding = hasTitle ? basePadding + 20 : basePadding;
        
        let ax1 = minX - basePadding;
        let ay1 = minY - topPadding;
        let ax2 = maxX + basePadding;
        let ay2 = maxY + basePadding;

        // Expand to wrap child boundaries
        finalizedBoundaries.forEach((finalRect, descendantId) => {
          if (isDescendant(b.node, descendantId)) {
            const spacing = 14;
            ax1 = Math.min(ax1, finalRect.x - spacing);
            ay1 = Math.min(ay1, finalRect.y - spacing);
            ax2 = Math.max(ax2, finalRect.x + finalRect.width + spacing);
            ay2 = Math.max(ay2, finalRect.y + finalRect.height + spacing);
          }
        });

        finalizedBoundaries.set(b.id, {
          x: ax1,
          y: ay1,
          width: ax2 - ax1,
          height: ay2 - ay1
        });
      });

      finalizedBoundaries.forEach((rect, id) => {
        const bInfo = boundariesList.find((b) => b.id === id);
        if (bInfo) {
          newBoundaries.push({
            id,
            rect,
            style: bInfo.style
          });
        }
      });

      // 2.5. Calculate Summary Braces and Positions
      const newBraces: SummaryBrace[] = [];
      const newSummaryPositions: SummaryPosition[] = [];

      interface SummaryData {
        parentId: string;
        summary: any;
        node: MindMapNode;
      }
      const summariesList: SummaryData[] = [];
      const collectSummaries = (currNode: MindMapNode) => {
        if (currNode.summaries && currNode.summaries.length > 0) {
          currNode.summaries.forEach((s) => {
            summariesList.push({ parentId: currNode.id, summary: s, node: currNode });
          });
        }
        if (currNode.children) {
          currNode.children.forEach(collectSummaries);
        }
        if (currNode.summaries) {
          currNode.summaries.forEach((s) => {
            if (s.children) {
              s.children.forEach(collectSummaries);
            }
          });
        }
      };
      collectSummaries(tree);

      summariesList.forEach((s) => {
        const startEl = treeContainer.querySelector(`[data-node-id="${s.summary.startNodeId}"]`);
        const endEl = treeContainer.querySelector(`[data-node-id="${s.summary.endNodeId}"]`);
        if (!startEl || !endEl) return;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();

        const startCoords = getUnzoomedCoords(startRect);
        const endCoords = getUnzoomedCoords(endRect);

        const parentEl = treeContainer.querySelector(`[data-node-id="${s.parentId}"]`);
        const parentCoords = parentEl ? getUnzoomedCoords(parentEl.getBoundingClientRect()) : null;

        // Determine direction
        let direction: 'left' | 'right' | 'down' = 'right';
        const structure = s.node.style?.structure || 'logic';
        
        if (structure === 'org' || structure === 'timeline') {
          direction = 'down';
        } else if (parentCoords) {
          const startCenter = startCoords.left + startCoords.width / 2;
          const parentCenter = parentCoords.left + parentCoords.width / 2;
          if (startCenter < parentCenter) {
            direction = 'left';
          }
        }

        const parentNode = findNodeById(tree, s.parentId);
        const allRangedIds: string[] = [];
        if (parentNode && parentNode.children) {
          const idxStart = parentNode.children.findIndex((c) => c.id === s.summary.startNodeId);
          const idxEnd = parentNode.children.findIndex((c) => c.id === s.summary.endNodeId);
          if (idxStart !== -1 && idxEnd !== -1) {
            const idxMin = Math.min(idxStart, idxEnd);
            const idxMax = Math.max(idxStart, idxEnd);
            const rangedSiblings = parentNode.children.slice(idxMin, idxMax + 1);
            rangedSiblings.forEach((sibling) => {
              allRangedIds.push(...getVisibleDescendants(sibling));
            });
          }
        }
        if (allRangedIds.length === 0) {
          allRangedIds.push(s.summary.startNodeId, s.summary.endNodeId);
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        allRangedIds.forEach((nid) => {
          const cardEl = treeContainer.querySelector(`[data-node-id="${nid}"]`);
          if (cardEl) {
            const cardRect = cardEl.getBoundingClientRect();
            const unzoomed = getUnzoomedCoords(cardRect);
            minX = Math.min(minX, unzoomed.left);
            minY = Math.min(minY, unzoomed.top);
            maxX = Math.max(maxX, unzoomed.right);
            maxY = Math.max(maxY, unzoomed.bottom);
          }
        });

        if (minX === Infinity) {
          minX = Math.min(startCoords.left, endCoords.left);
          minY = Math.min(startCoords.top, endCoords.top);
          maxX = Math.max(startCoords.right, endCoords.right);
          maxY = Math.max(startCoords.bottom, endCoords.bottom);
        }

        // Draw range-based boundary instead of brace
        const basePadding = 12;
        const hasTitle = !!s.summary.text;
        const topPadding = hasTitle ? basePadding + 20 : basePadding;
        
        const rect = {
          x: minX - basePadding,
          y: minY - topPadding,
          width: (maxX - minX) + basePadding * 2,
          height: (maxY - minY) + topPadding + basePadding
        };

        const bStyle = {
          title: s.summary.text || '',
          fillColor: s.summary.style?.backgroundColor || 'rgba(99, 102, 241, 0.05)',
          borderColor: s.summary.style?.borderColor || '#6366f1',
          borderStyle: s.summary.style?.borderStyle || 'dashed'
        };

        newBoundaries.push({
          id: s.summary.id,
          rect,
          style: bStyle
        });
      });

      setBraces([]);
      previousPositionsRef.current = '[]';
      onUpdateSummaryPositions?.([]);

      // 3. Calculate Relationship Lines
      const newRelLines: RelationshipLine[] = [];
      const relationships = tree.relationships || [];

      relationships.forEach((rel) => {
        const fromEl = treeContainer.querySelector(`[data-node-id="${rel.fromId}"]`);
        const toEl = treeContainer.querySelector(`[data-node-id="${rel.toId}"]`);
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const fromCoords = getUnzoomedCoords(fromRect);
        const toCoords = getUnzoomedCoords(toRect);

        const ax = fromCoords.left + fromCoords.width / 2;
        const ay = fromCoords.top + fromCoords.height / 2;
        const bx = toCoords.left + toCoords.width / 2;
        const by = toCoords.top + toCoords.height / 2;

        // Smart sector-based connection sides: if cards are separated horizontally, only connect via left/right edges
        const horizontalOverlap = !(fromCoords.right < toCoords.left || toCoords.right < fromCoords.left);
        
        let aSides: { x: number; y: number }[] = [];
        let bSides: { x: number; y: number }[] = [];

        if (!horizontalOverlap) {
          aSides = [
            { x: fromCoords.left, y: ay },
            { x: fromCoords.right, y: ay }
          ];
          bSides = [
            { x: toCoords.left, y: by },
            { x: toCoords.right, y: by }
          ];
        } else {
          aSides = [
            { x: ax, y: fromCoords.top },
            { x: ax, y: fromCoords.bottom },
            { x: fromCoords.left, y: ay },
            { x: fromCoords.right, y: ay }
          ];
          bSides = [
            { x: bx, y: toCoords.top },
            { x: bx, y: toCoords.bottom },
            { x: toCoords.left, y: by },
            { x: toCoords.right, y: by }
          ];
        }

        let minDistance = Infinity;
        let bestStart = aSides[0];
        let bestEnd = bSides[0];

        aSides.forEach((a) => {
          bSides.forEach((b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
              minDistance = dist;
              bestStart = a;
              bestEnd = b;
            }
          });
        });

        const mx = (bestStart.x + bestEnd.x) / 2;
        const my = (bestStart.y + bestEnd.y) / 2;
        const dx = bestEnd.x - bestStart.x;
        const dy = bestEnd.y - bestStart.y;
        const L = Math.sqrt(dx * dx + dy * dy);

        let path = '';
        let lx = mx;
        let ly = my;

        if (L > 20) {
          const nx = -dy / L;
          const ny = dx / L;
          const offset = Math.min(50, L * 0.15);
          const cpx = mx + nx * offset;
          const cpy = my + ny * offset;

          path = `M ${bestStart.x} ${bestStart.y} Q ${cpx} ${cpy} ${bestEnd.x} ${bestEnd.y}`;
          // Midpoint of quadratic bezier curve at t=0.5
          lx = 0.25 * bestStart.x + 0.5 * cpx + 0.25 * bestEnd.x;
          ly = 0.25 * bestStart.y + 0.5 * cpy + 0.25 * bestEnd.y;
        } else {
          path = `M ${bestStart.x} ${bestStart.y} L ${bestEnd.x} ${bestEnd.y}`;
        }

        newRelLines.push({
          id: rel.id,
          path,
          labelX: lx,
          labelY: ly,
          text: rel.text || '',
          isSelected: rel.id === selectedRelId
        });
      });

      setRelLines(newRelLines);
      setBoundaries(newBoundaries);
    };

    let settleEndTime = Date.now() + 1500;
    let animId: number;

    const loop = () => {
      try {
        calculateConnections();
      } catch (err) {
        console.error("Error calculating SVG connections:", err);
      }
      if (Date.now() < settleEndTime) {
        animId = requestAnimationFrame(loop);
      }
    };
    loop();

    const treeContainer = containerRef.current?.closest('.tree-container');
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let handleTransitionEnd: ((e: Event) => void) | null = null;
    if (treeContainer) {
      // 1. ResizeObserver for card size changes (editing text, font loading)
      resizeObserver = new ResizeObserver(() => {
        calculateConnections();
      });
      resizeObserver.observe(treeContainer);
      const cards = treeContainer.querySelectorAll('.node-card');
      cards.forEach((card) => resizeObserver?.observe(card));

      // 2. MutationObserver for DOM layout/structural changes (collapsing, rendering new branches)
      mutationObserver = new MutationObserver((mutations) => {
        // Skip mutations that originate from the SVG itself, relationship labels, or style changes on tree-branches (to avoid infinite loop of marginTop adjustments)
        const hasExternalMutation = mutations.some((m) => {
          const target = m.target as HTMLElement;
          if (!target || typeof target.closest !== 'function') return true;
          
          const isSvgOrRel = target.closest('.svg-connections') || target.closest('.relationship-label-card');
          const isTreeBranchStyle = target.classList && target.classList.contains('tree-branch') && m.attributeName === 'style';
          
          return !isSvgOrRel && !isTreeBranchStyle;
        });
        if (hasExternalMutation) {
          calculateConnections();
        }
      });
      mutationObserver.observe(treeContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      // 3. transitionend event listener for transition completions
      handleTransitionEnd = () => {
        calculateConnections();
      };
      treeContainer.addEventListener('transitionend', handleTransitionEnd);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      if (treeContainer && handleTransitionEnd) {
        treeContainer.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
  }, [tree, redrawTrigger, themeLineColor, themeBranchColors, zoom, selectedRelId, selectedNodeId]);

  return (
    <>
      <svg
        ref={containerRef}
        className="svg-connections"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--theme-rel-line-color)" />
          </marker>
          <marker
            id="arrow-selected"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--theme-rel-line-active-color)" />
          </marker>
        </defs>

        {/* 0. Subtree boundaries (rendered behind connection lines) */}
        {boundaries.map((b) => {
          const isSelected = selectedNodeId === b.id;
          const strokeColor = isSelected ? 'var(--theme-accent-color)' : (b.style.borderColor || 'rgba(99, 102, 241, 0.4)');
          const strokeWidth = isSelected ? 2.5 : 1.5;

          return (
            <g key={b.id}>
              <rect
                x={b.rect.x}
                y={b.rect.y}
                width={b.rect.width}
                height={b.rect.height}
                rx={8}
                ry={8}
                fill={b.style.fillColor || 'rgba(99, 102, 241, 0.05)'}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={b.style.borderStyle === 'dashed' ? '5,4' : undefined}
                style={{ pointerEvents: 'stroke', cursor: 'pointer', transition: 'all 0.2s ease-out' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(b.id);
                }}
              />
              {b.style.title && (
                <text
                  x={b.rect.x + 8}
                  y={b.rect.y + 18}
                  className="boundary-title-text"
                  fill={strokeColor}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fill: strokeColor
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode?.(b.id);
                  }}
                >
                  {b.style.title}
                </text>
              )}
            </g>
          );
        })}

        {/* Tree Hierarchical Lines */}
        {lines.map((line) => (
          <path
            key={line.id}
            d={line.path}
            className="connection-path"
            stroke={line.color}
            strokeWidth={line.strokeWidth !== undefined ? line.strokeWidth : 2.5}
            fill={line.fill || 'none'}
            style={{ fill: line.fill || 'none' }}
          />
        ))}

        {/* User Relationship Lines */}
        {relLines.map((rel) => (
          <path
            key={rel.id}
            d={rel.path}
            stroke={rel.isSelected ? 'var(--theme-rel-line-active-color)' : 'var(--theme-rel-line-color)'}
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
            markerEnd={rel.isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRel?.(rel.id);
            }}
          />
        ))}

        {/* Summary Braces */}
        {braces.map((brace) => (
          <path
            key={brace.id}
            d={brace.path}
            className="summary-brace-path"
            stroke={brace.color}
            strokeWidth={2.5}
            fill="none"
            style={{ pointerEvents: 'none', transition: 'stroke 0.2s' }}
          />
        ))}
      </svg>

      {/* Relationship Label Cards */}
      {relLines.map((rel) => (
        <RelationshipLabelCard
          key={rel.id}
          rel={rel}
          isSelected={rel.isSelected}
          onSelect={() => onSelectRel?.(rel.id)}
          onUpdateText={onUpdateRelText}
        />
      ))}
    </>
  );
};
export default SVGConnections;
