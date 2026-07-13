import React, { useEffect, useState, useRef } from 'react';
import type { MindMapNode, BoundaryStyle, SummaryPosition } from '../types/mindmap';
import { findParent } from '../utils/treeUtils';

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
}

interface ConnectionLine {
  id: string;
  path: string;
  color: string;
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
        <span>{rel.text || '雙擊新增關聯文字'}</span>
      )}
    </div>
  );
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
  onUpdateSummaryPositions
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

      // 1. Traverse Hierarchical Branches
      const rootNode = tree.children.find((c: MindMapNode) => c.id === 'root');
      const isTimelineMode = rootNode?.style?.structure === 'timeline';

      const traverse = (node: MindMapNode, branchIndex: number = -1, isLeft: boolean = false) => {
        if (node.id === 'virtual-root') {
          node.children.forEach((child) => traverse(child, -1, false));
          return;
        }

        if (node.isCollapsed || !node.children || node.children.length === 0) return;

        const parentEl = treeContainer.querySelector(`[data-node-id="${node.id}"]`);
        if (!parentEl) return;

        const parentRect = parentEl.getBoundingClientRect();
        const pCoords = getUnzoomedCoords(parentRect);
        
        const isRootNode = node.id === 'root';
        let structure = node.style?.structure || 'logic';
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

          const isLeftGeom = (cCoords.left + cCoords.width / 2) < (pCoords.left + pCoords.width / 2);

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
          } else if (node.id === 'root' && structure === 'timeline') {
            // Straight horizontal line for main timeline axis
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else if (structure === 'tree' || isTimelineUp || isTimelineDown) {
            // Vertical-first elbow connection for up/down branches
            path = `M ${startX} ${startY} V ${endY} H ${endX}`;
          } else if (structure === 'fishbone') {
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else if (structure === 'brace') {
            const sign = isLeftGeom ? -1 : 1;
            const cp1x = startX + 15 * sign;
            const cp1y = startY;
            const cp2x = startX + 15 * sign;
            const cp2y = endY;
            path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          } else {
            const controlXOffset = Math.min(100, Math.max(30, Math.abs(endX - startX) * 0.5));
            const sign = isLeftGeom ? -1 : 1;
            const cp1x = startX + controlXOffset * sign;
            const cp1y = startY;
            const cp2x = endX - controlXOffset * sign;
            const cp2y = endY;
            path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          }

          let lineBranchIndex = branchIndex;
          if (node.id === 'root') {
            lineBranchIndex = idx;
          }

          const strokeColor = (themeBranchColors && themeBranchColors.length > 0 && lineBranchIndex >= 0 && !isTimelineMode)
            ? themeBranchColors[lineBranchIndex % themeBranchColors.length]
            : themeLineColor;

          newLines.push({
            id: `${node.id}-${child.id}`,
            path,
            color: strokeColor
          });

          let childIsLeft = isLeft;
          if (isRootNode) {
            if (structure === 'logic-left') {
              childIsLeft = true;
            } else if (structure === 'logic') {
              childIsLeft = false;
            } else if (structure === 'mindmap') {
              childIsLeft = (idx % 2 === 0);
            }
          } else {
            if (structure === 'logic-left') {
              childIsLeft = true;
            } else if (structure === 'logic') {
              childIsLeft = false;
            }
          }

          traverse(child, lineBranchIndex, childIsLeft);
        });
      };

      traverse(tree, -1, false);
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

        let path = '';
        let cardX = 0;
        let cardY = 0;
        const w = 12;

        if (direction === 'right') {
          const minY = Math.min(startCoords.top, endCoords.top);
          const maxY = Math.max(startCoords.bottom, endCoords.bottom);
          const center = (minY + maxY) / 2;
          const maxX = Math.max(startCoords.right, endCoords.right);
          const x = maxX + 8;
          const currentR = Math.min(8, (maxY - minY) / 2);

          path = `M ${x} ${minY} Q ${x + currentR} ${minY}, ${x + currentR} ${minY + currentR} L ${x + currentR} ${center - currentR} Q ${x + currentR} ${center}, ${x + w} ${center} Q ${x + currentR} ${center}, ${x + currentR} ${center + currentR} L ${x + currentR} ${maxY - currentR} Q ${x + currentR} ${maxY}, ${x} ${maxY}`;
          cardX = x + w + 10;
          cardY = center;
        } else if (direction === 'left') {
          const minY = Math.min(startCoords.top, endCoords.top);
          const maxY = Math.max(startCoords.bottom, endCoords.bottom);
          const center = (minY + maxY) / 2;
          const minX = Math.min(startCoords.left, endCoords.left);
          const x = minX - 8;
          const currentR = Math.min(8, (maxY - minY) / 2);

          path = `M ${x} ${minY} Q ${x - currentR} ${minY}, ${x - currentR} ${minY + currentR} L ${x - currentR} ${center - currentR} Q ${x - currentR} ${center}, ${x - w} ${center} Q ${x - currentR} ${center}, ${x - currentR} ${center + currentR} L ${x - currentR} ${maxY - currentR} Q ${x - currentR} ${maxY}, ${x} ${maxY}`;
          cardX = x - w - 10;
          cardY = center;
        } else {
          // down
          const minX = Math.min(startCoords.left, endCoords.left);
          const maxX = Math.max(startCoords.right, endCoords.right);
          const center = (minX + maxX) / 2;
          const maxY = Math.max(startCoords.bottom, endCoords.bottom);
          const y = maxY + 8;
          const currentR = Math.min(8, (maxX - minX) / 2);

          path = `M ${minX} ${y} Q ${minX} ${y + currentR}, ${minX + currentR} ${y + currentR} L ${center - currentR} ${y + currentR} Q ${center} ${y + currentR}, ${center} ${y + w} Q ${center} ${y + currentR}, ${center + currentR} ${y + currentR} L ${maxX - currentR} ${y + currentR} Q ${maxX} ${y + currentR}, ${maxX} ${y}`;
          cardX = center;
          cardY = y + w + 10;
        }

        newBraces.push({
          id: s.summary.id,
          path,
          color: themeLineColor
        });

        newSummaryPositions.push({
          id: s.summary.id,
          x: cardX,
          y: cardY,
          direction,
          node: s.summary as unknown as MindMapNode
        });
      });

      setBraces(newBraces);

      // Trigger callback if changed to prevent render loops
      const currentPositionsSerialized = JSON.stringify(newSummaryPositions.map(p => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        direction: p.direction,
        text: p.node.text
      })));
      if (currentPositionsSerialized !== previousPositionsRef.current) {
        previousPositionsRef.current = currentPositionsSerialized;
        onUpdateSummaryPositions?.(newSummaryPositions);
      }

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
        // Skip mutations that originate from the SVG itself or the relationship labels to avoid infinite loops
        const hasExternalMutation = mutations.some((m) => {
          const target = m.target as HTMLElement;
          return !target.closest('.svg-connections') && !target.closest('.relationship-label-card');
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
        {boundaries.map((b) => (
          <g key={b.id}>
            <rect
              x={b.rect.x}
              y={b.rect.y}
              width={b.rect.width}
              height={b.rect.height}
              rx={8}
              ry={8}
              fill={b.style.fillColor || 'rgba(99, 102, 241, 0.05)'}
              stroke={b.style.borderColor || 'rgba(99, 102, 241, 0.4)'}
              strokeWidth={1.5}
              strokeDasharray={b.style.borderStyle === 'dashed' ? '5,4' : undefined}
              style={{ pointerEvents: 'none', transition: 'all 0.2s ease-out' }}
            />
            {b.style.title && (
              <text
                x={b.rect.x + 8}
                y={b.rect.y + 18}
                className="boundary-title-text"
                fill={b.style.borderColor || 'var(--theme-accent-color)'}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  fill: b.style.borderColor || 'var(--theme-accent-color)'
                }}
              >
                {b.style.title}
              </text>
            )}
          </g>
        ))}

        {/* Tree Hierarchical Lines */}
        {lines.map((line) => (
          <path
            key={line.id}
            d={line.path}
            className="connection-path"
            stroke={line.color}
            strokeWidth={2.5}
            fill="none"
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
