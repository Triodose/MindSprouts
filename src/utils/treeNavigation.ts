import type { MindMapNode } from '../types/mindmap';
import { findNode } from './treeUtils';

// Find the parent node of a given node ID
export const findParentNode = (root: MindMapNode, targetId: string): MindMapNode | null => {
  if (root.id === targetId) return null;
  
  if (root.children.some((child) => child.id === targetId)) {
    return root;
  }

  for (const child of root.children) {
    const parent = findParentNode(child, targetId);
    if (parent) return parent;
  }

  return null;
};

// Navigate to sibling above or below
export const navigateVertical = (
  root: MindMapNode,
  currentId: string,
  direction: 'up' | 'down'
): string => {
  const parent = findParentNode(root, currentId);
  if (!parent) return currentId; // Root has no siblings

  const index = parent.children.findIndex((c) => c.id === currentId);
  if (index === -1) return currentId;

  if (direction === 'up' && index > 0) {
    return parent.children[index - 1].id;
  } else if (direction === 'down' && index < parent.children.length - 1) {
    return parent.children[index + 1].id;
  }

  return currentId;
};

// Navigate to parent (Left arrow)
export const navigateLeft = (root: MindMapNode, currentId: string): string => {
  const parent = findParentNode(root, currentId);
  return parent ? parent.id : currentId;
};

// Navigate to child (Right arrow)
export const navigateRight = (root: MindMapNode, currentId: string): string => {
  const node = findNode(root, currentId);
  if (node && node.children && node.children.length > 0 && !node.isCollapsed) {
    return node.children[0].id;
  }
  return currentId;
};
