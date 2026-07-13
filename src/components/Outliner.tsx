import React, { useRef, useEffect } from 'react';
import type { MindMapNode } from '../types/mindmap';

interface OutlinerProps {
  tree: MindMapNode;
  selectedId: string | null;
  theme: any;
  setSelectedId: (id: string | null) => void;
  updateNodeText: (id: string, text: string) => void;
  addNodeSibling: (siblingId: string) => void;
  deleteNodeSelected: (id: string) => void;
  indentNodeSelected: (id: string) => void;
  outdentNodeSelected: (id: string) => void;
}

interface FlatNode {
  id: string;
  text: string;
  depth: number;
}

export const Outliner: React.FC<OutlinerProps> = ({
  tree,
  selectedId,
  theme,
  setSelectedId,
  updateNodeText,
  addNodeSibling,
  deleteNodeSelected,
  indentNodeSelected,
  outdentNodeSelected
}) => {
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Flatten the virtual-root tree recursively
  const flattenTree = (node: MindMapNode, depth = 0, result: FlatNode[] = []): FlatNode[] => {
    if (node.id !== 'virtual-root') {
      result.push({
        id: node.id,
        text: node.text,
        depth: depth - 1 // root is depth 0, children depth 1+
      });
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => flattenTree(child, depth + 1, result));
    }
    return result;
  };

  const flatNodes = flattenTree(tree);

  // Synchronize focus when selectedId changes from keyboard or mouse actions
  useEffect(() => {
    if (selectedId && inputRefs.current[selectedId]) {
      const input = inputRefs.current[selectedId];
      if (input) {
        input.focus();
        // Place cursor at the end of the text
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  }, [selectedId]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    node: FlatNode,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add a sibling node to the current item
      addNodeSibling(node.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Outdent (move up a level)
        outdentNodeSelected(node.id);
      } else {
        // Tab: Indent (make it a child of preceding sibling)
        indentNodeSelected(node.id);
      }
    } else if (e.key === 'Backspace') {
      // If node text is empty and not the main root topic, delete it
      if (node.text === '' && node.id !== 'root') {
        e.preventDefault();
        const prevNode = flatNodes[index - 1];
        if (prevNode) {
          setSelectedId(prevNode.id);
        }
        deleteNodeSelected(node.id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevNode = flatNodes[index - 1];
      if (prevNode) {
        setSelectedId(prevNode.id);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextNode = flatNodes[index + 1];
      if (nextNode) {
        setSelectedId(nextNode.id);
      }
    }
  };

  // Determine bullet list symbol based on depth
  const renderBullet = (depth: number) => {
    if (depth === 0) {
      return (
        <span
          className="outliner-bullet-root"
          style={{ backgroundColor: theme.accentColor }}
        />
      );
    } else if (depth === 1) {
      return (
        <span
          className="outliner-bullet-branch"
          style={{ borderColor: theme.accentColor }}
        />
      );
    } else {
      return <span className="outliner-bullet-leaf" />;
    }
  };

  return (
    <div className="outliner-container glass-panel">
      <div className="outliner-header">
        <h2 style={{ color: theme.accentColor }}>📝 大綱編輯模式</h2>
        <p className="outliner-subtitle">
          支援雙向同步：<code>Enter</code> 新增項目、<code>Tab</code> 縮排、<code>Shift+Tab</code> 反縮排、<code>↑ / ↓</code> 導覽。
        </p>
      </div>

      <div className="outliner-list-wrapper">
        {flatNodes.map((node, index) => {
          const isSelected = selectedId === node.id;
          
          // Apply typography sizing based on hierarchy depth
          let fontSize = '14px';
          let fontWeight = '400';
          if (node.depth === 0) {
            fontSize = '18px';
            fontWeight = '700';
          } else if (node.depth === 1) {
            fontSize = '15px';
            fontWeight = '600';
          }

          return (
            <div
              key={node.id}
              className={`outliner-item ${isSelected ? 'selected' : ''}`}
              style={{
                paddingLeft: `${node.depth * 28 + 12}px`,
                fontSize,
                fontWeight
              }}
              onClick={() => setSelectedId(node.id)}
            >
              <div className="outliner-bullet-wrapper">
                {renderBullet(node.depth)}
              </div>
              <input
                ref={(el) => {
                  inputRefs.current[node.id] = el;
                }}
                type="text"
                value={node.text}
                onChange={(e) => updateNodeText(node.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, node, index)}
                placeholder={node.depth === 0 ? "輸入主題名稱..." : "分支主題"}
                className="outliner-input"
                style={{
                  color: isSelected ? theme.accentColor : 'inherit'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Outliner;
