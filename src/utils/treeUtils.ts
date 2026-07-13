import type { MindMapNode, Relationship, MindMapSummary } from '../types/mindmap';

// Unique ID generator
export const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Find a node recursively by ID (including summary nodes and their children)
export const findNode = (node: MindMapNode, id: string): MindMapNode | null => {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  if (node.summaries) {
    for (const summary of node.summaries) {
      if (summary.id === id) {
        return summary as unknown as MindMapNode;
      }
      if (summary.children) {
        for (const child of summary.children) {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
    }
  }
  return null;
};

// Add a child node recursively
export const addChildNode = (
  root: MindMapNode,
  parentId: string,
  newChild: MindMapNode
): MindMapNode => {
  if (root.id === parentId) {
    return {
      ...root,
      isCollapsed: false, // Auto-expand when adding a child
      children: [...root.children, newChild]
    };
  }

  // Handle children
  const newChildren = root.children.map((child) => addChildNode(child, parentId, newChild));

  // Handle summaries
  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries.map((summary) => {
      if (summary.id === parentId) {
        return {
          ...summary,
          children: [...(summary.children || []), newChild]
        };
      }
      if (summary.children) {
        return {
          ...summary,
          children: summary.children.map((child) => addChildNode(child, parentId, newChild))
        };
      }
      return summary;
    });
  }

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Add a sibling node recursively
export const addSiblingNode = (
  root: MindMapNode,
  targetId: string,
  newSibling: MindMapNode
): { newTree: MindMapNode; success: boolean } => {
  // If target is virtual-root, we cannot add a sibling
  if (root.id === targetId && targetId === 'virtual-root') {
    return { newTree: root, success: false };
  }

  // Check if target is a child of the current node
  const targetIndex = root.children.findIndex((c) => c.id === targetId);
  if (targetIndex !== -1) {
    const newChildren = [...root.children];
    // Insert new sibling immediately after the target node
    newChildren.splice(targetIndex + 1, 0, newSibling);
    return {
      newTree: { ...root, children: newChildren },
      success: true
    };
  }

  // Check in summaries of current node
  if (root.summaries) {
    let success = false;
    const updatedSummaries = root.summaries.map((summary) => {
      if (success) return summary;
      
      // Check if target is a child of this summary
      if (summary.children) {
        const sTargetIndex = summary.children.findIndex((c) => c.id === targetId);
        if (sTargetIndex !== -1) {
          const sNewChildren = [...summary.children];
          sNewChildren.splice(sTargetIndex + 1, 0, newSibling);
          success = true;
          return {
            ...summary,
            children: sNewChildren
          };
        }
      }
      return summary;
    });

    if (success) {
      return {
        newTree: { ...root, summaries: updatedSummaries },
        success: true
      };
    }
  }

  // Otherwise recurse down children
  let found = false;
  const updatedChildren = root.children.map((child) => {
    if (found) return child;
    const res = addSiblingNode(child, targetId, newSibling);
    if (res.success) {
      found = true;
      return res.newTree;
    }
    return child;
  });

  if (found) {
    return {
      newTree: { ...root, children: updatedChildren },
      success: true
    };
  }

  // Recurse down summaries
  if (root.summaries) {
    let sFound = false;
    const updatedSummaries = root.summaries.map((summary) => {
      if (sFound || !summary.children) return summary;
      
      const newChildren = summary.children.map((child) => {
        if (sFound) return child;
        const res = addSiblingNode(child, targetId, newSibling);
        if (res.success) {
          sFound = true;
          return res.newTree;
        }
        return child;
      });

      if (sFound) {
        return {
          ...summary,
          children: newChildren
        };
      }
      return summary;
    });

    if (sFound) {
      return {
        newTree: { ...root, summaries: updatedSummaries },
        success: true
      };
    }
  }

  return {
    newTree: root,
    success: false
  };
};

// Recursively collect all node IDs in a tree (including summary nodes and their children)
const collectAllIds = (node: MindMapNode): Set<string> => {
  const ids = new Set<string>([node.id]);
  node.children.forEach((child) => {
    collectAllIds(child).forEach((id) => ids.add(id));
  });
  if (node.summaries) {
    node.summaries.forEach((summary) => {
      ids.add(summary.id);
      if (summary.children) {
        summary.children.forEach((child) => {
          collectAllIds(child).forEach((id) => ids.add(id));
        });
      }
    });
  }
  return ids;
};

// Clean any relationships where fromId or toId does not exist in the tree
export const cleanRelationships = (root: MindMapNode): MindMapNode => {
  if (!root.relationships) return root;
  const existingIds = collectAllIds(root);
  const activeRels = root.relationships.filter(
    (rel) => existingIds.has(rel.fromId) && existingIds.has(rel.toId)
  );
  return {
    ...root,
    relationships: activeRels
  };
};

// Delete a node recursively
export const deleteNode = (
  root: MindMapNode,
  targetId: string
): { newTree: MindMapNode; deleted: boolean } => {
  const result = deleteNodeInner(root, targetId);
  return {
    newTree: cleanRelationships(result.newTree),
    deleted: result.deleted
  };
};

const deleteNodeInner = (
  root: MindMapNode,
  targetId: string
): { newTree: MindMapNode; deleted: boolean } => {
  // Cannot delete virtual-root
  if (root.id === targetId && targetId === 'virtual-root') {
    return { newTree: root, deleted: false };
  }

  // Check if target is a direct child of the current node
  const targetIndex = root.children.findIndex((c) => c.id === targetId);
  if (targetIndex !== -1) {
    const deletedChildId = targetId;
    let newSummaries = root.summaries;
    if (root.summaries) {
      newSummaries = root.summaries.filter(
        (s) => s.startNodeId !== deletedChildId && s.endNodeId !== deletedChildId
      );
    }
    return {
      newTree: {
        ...root,
        children: root.children.filter((c) => c.id !== targetId),
        summaries: newSummaries
      },
      deleted: true
    };
  }

  // Check if target is a summary itself or inside a summary
  if (root.summaries) {
    // 1. Is target the summary itself?
    const summaryIndex = root.summaries.findIndex((s) => s.id === targetId);
    if (summaryIndex !== -1) {
      return {
        newTree: {
          ...root,
          summaries: root.summaries.filter((s) => s.id !== targetId)
        },
        deleted: true
      };
    }

    // 2. Is target a child of one of the summaries?
    let sDeleted = false;
    const updatedSummaries = root.summaries.map((summary) => {
      if (sDeleted || !summary.children) return summary;

      const targetChildIndex = summary.children.findIndex((c) => c.id === targetId);
      if (targetChildIndex !== -1) {
        sDeleted = true;
        return {
          ...summary,
          children: summary.children.filter((c) => c.id !== targetId)
        };
      }

      // Recurse into children of this summary
      const newChildren = summary.children.map((child) => {
        if (sDeleted) return child;
        const res = deleteNodeInner(child, targetId);
        if (res.deleted) {
          sDeleted = true;
          return res.newTree;
        }
        return child;
      });

      if (sDeleted) {
        return {
          ...summary,
          children: newChildren
        };
      }
      return summary;
    });

    if (sDeleted) {
      return {
        newTree: { ...root, summaries: updatedSummaries },
        deleted: true
      };
    }
  }

  // Otherwise recurse down children
  let found = false;
  const updatedChildren = root.children.map((child) => {
    if (found) return child;
    const res = deleteNodeInner(child, targetId);
    if (res.deleted) {
      found = true;
      return res.newTree;
    }
    return child;
  });

  return {
    newTree: { ...root, children: updatedChildren },
    deleted: found
  };
};

// Update node properties recursively
export const updateNode = (
  root: MindMapNode,
  targetId: string,
  updates: Partial<Omit<MindMapNode, 'id' | 'children'>>
): MindMapNode => {
  if (root.id === targetId) {
    return {
      ...root,
      ...updates,
      style: updates.style ? { ...root.style, ...updates.style } : root.style
    };
  }

  // Update inside children
  const newChildren = root.children.map((child) => updateNode(child, targetId, updates));

  // Update inside summaries
  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries.map((summary) => {
      if (summary.id === targetId) {
        const updatedSummaryNode = {
          ...summary,
          ...updates,
          style: updates.style ? { ...summary.style, ...updates.style } : summary.style
        };
        return updatedSummaryNode as unknown as MindMapSummary;
      }
      if (summary.children) {
        return {
          ...summary,
          children: summary.children.map((child) => updateNode(child, targetId, updates))
        };
      }
      return summary;
    });
  }

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Check if targetId is a descendant of node
export const isDescendant = (root: MindMapNode, parentId: string, descendantId: string): boolean => {
  const parentNode = findNode(root, parentId);
  if (!parentNode) return false;
  return findNode(parentNode, descendantId) !== null;
};

// Remove a node from its parent in the tree
export const removeNode = (root: MindMapNode, targetId: string): MindMapNode => {
  const newChildren = root.children
    .filter((child) => child.id !== targetId)
    .map((child) => removeNode(child, targetId));

  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries
      .filter((summary) => summary.id !== targetId)
      .map((summary) => {
        if (summary.children) {
          return {
            ...summary,
            children: summary.children
              .filter((child) => child.id !== targetId)
              .map((child) => removeNode(child, targetId))
          };
        }
        return summary;
      });
  }

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Re-parent a node from its old location to a new parent
export const reparentNode = (
  root: MindMapNode,
  nodeId: string,
  newParentId: string
): MindMapNode => {
  const nodeToMove = findNode(root, nodeId);
  if (!nodeToMove) return root;

  // Clean old node's position offset since it is now structured under a parent
  const cleanedNode = {
    ...nodeToMove,
    offset: undefined
  };

  // 1. Remove node from its old parent
  const treeWithoutNode = removeNode(root, nodeId);

  // 2. Add it to the new parent
  return addChildNode(treeWithoutNode, newParentId, cleanedNode);
};

// Reorder a node by placing it as a sibling of targetId (before or after)
export const reorderNode = (
  root: MindMapNode,
  nodeId: string,
  targetId: string,
  position: 'before' | 'after'
): MindMapNode => {
  const nodeToMove = findNode(root, nodeId);
  if (!nodeToMove) return root;

  const cleanedNode = {
    ...nodeToMove,
    offset: undefined
  };

  // 1. Remove node from the tree
  const treeWithoutNode = removeNode(root, nodeId);

  // 2. Find target node's parent in the clean tree
  const parent = findParent(treeWithoutNode, targetId);
  if (!parent) return root;

  let updatedChildren: MindMapNode[];

  if (parent.id === 'root' && (parent.style?.structure || 'logic') === 'mindmap') {
    // Sibling reordering for mindmap: separate left and right children
    const originalParent = findParent(root, targetId);
    const targetIdxInOriginal = originalParent ? originalParent.children.findIndex((c) => c.id === targetId) : -1;
    const isLeft = targetIdxInOriginal !== -1 ? targetIdxInOriginal % 2 === 0 : true;

    const originalChildren = originalParent ? originalParent.children : [];
    const leftChildren = parent.children.filter(c => {
      const origIdx = originalChildren.findIndex(oc => oc.id === c.id);
      return origIdx !== -1 ? origIdx % 2 === 0 : true;
    });
    const rightChildren = parent.children.filter(c => {
      const origIdx = originalChildren.findIndex(oc => oc.id === c.id);
      return origIdx !== -1 ? origIdx % 2 !== 0 : false;
    });

    if (isLeft) {
      const targetIndex = leftChildren.findIndex((c) => c.id === targetId);
      if (targetIndex !== -1) {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        leftChildren.splice(insertIndex, 0, cleanedNode);
      }
    } else {
      const targetIndex = rightChildren.findIndex((c) => c.id === targetId);
      if (targetIndex !== -1) {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        rightChildren.splice(insertIndex, 0, cleanedNode);
      }
    }

    updatedChildren = [];
    const maxLen = Math.max(leftChildren.length, rightChildren.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < leftChildren.length) updatedChildren.push(leftChildren[i]);
      if (i < rightChildren.length) updatedChildren.push(rightChildren[i]);
    }
  } else {
    // Standard reordering (one-sided structure)
    const targetIndex = parent.children.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) return root;

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    updatedChildren = [...parent.children];
    updatedChildren.splice(insertIndex, 0, cleanedNode);
  }

  return updateNodeChildren(treeWithoutNode, parent.id, updatedChildren);
};

// Create a default starter tree with virtual-root
export const createInitialTree = (): MindMapNode => {
  const child1Id = generateId();
  const child2Id = generateId();
  
  return {
    id: 'virtual-root',
    text: 'Virtual Root',
    children: [
      {
        id: 'root',
        text: 'MindSprouts 心智圖',
        offset: { x: 150, y: window.innerHeight / 2 - 40 }, // Default position of main topic
        children: [
          {
            id: child1Id,
            text: '雙擊以修改內容',
            children: [
              {
                id: generateId(),
                text: '按 Tab 新增子節點',
                children: []
              },
              {
                id: generateId(),
                text: '按 Enter 新增兄弟節點',
                children: []
              }
            ]
          },
          {
            id: child2Id,
            text: '使用指南 💡',
            children: [
              {
                id: generateId(),
                text: '拖曳空白處以平移畫布',
                children: []
              },
              {
                id: generateId(),
                text: '滾動滑鼠以縮放比例',
                children: []
              }
            ]
          }
        ]
      }
    ]
  };
};

// Find parent node recursively (including summaries and summary children)
export const findParent = (root: MindMapNode, targetId: string): MindMapNode | null => {
  // Check if target is a child of root
  if (root.children.some((c) => c.id === targetId)) return root;

  // Check if target is one of root's summaries
  if (root.summaries && root.summaries.some((s) => s.id === targetId)) {
    return root;
  }

  // Check if target is a child of one of root's summaries
  if (root.summaries) {
    for (const summary of root.summaries) {
      if (summary.children && summary.children.some((c) => c.id === targetId)) {
        return summary as unknown as MindMapNode;
      }
    }
  }

  // Recurse down children
  for (const child of root.children) {
    const parent = findParent(child, targetId);
    if (parent) return parent;
  }

  // Recurse down summaries' children
  if (root.summaries) {
    for (const summary of root.summaries) {
      if (summary.children) {
        for (const child of summary.children) {
          const parent = findParent(child, targetId);
          if (parent) return parent;
        }
      }
    }
  }

  return null;
};

// Update children of a target node recursively
export const updateNodeChildren = (
  root: MindMapNode,
  targetId: string,
  newChildren: MindMapNode[]
): MindMapNode => {
  if (root.id === targetId) {
    return {
      ...root,
      children: newChildren
    };
  }
  return {
    ...root,
    children: root.children.map((child) => updateNodeChildren(child, targetId, newChildren))
  };
};

// Indent a node (make it a child of its preceding sibling)
export const indentNode = (root: MindMapNode, nodeId: string): MindMapNode => {
  const parent = findParent(root, nodeId);
  if (!parent) return root;

  const index = parent.children.findIndex((c) => c.id === nodeId);
  if (index <= 0) return root; // Cannot indent the first child

  const sibling = parent.children[index - 1];
  const nodeToMove = parent.children[index];

  // 1. Remove node from parent's children
  const updatedParentChildren = parent.children.filter((c) => c.id !== nodeId);

  // 2. Add it to the sibling's children
  const updatedSibling = {
    ...sibling,
    isCollapsed: false,
    children: [...sibling.children, { ...nodeToMove, offset: undefined }] // Clear offset since it's nested
  };

  // Replace old sibling with updatedSibling in the parent's children
  const finalParentChildren = updatedParentChildren.map((c) =>
    c.id === sibling.id ? updatedSibling : c
  );

  return updateNodeChildren(root, parent.id, finalParentChildren);
};

// Outdent a node (move it up a level, becoming a sibling of its parent)
export const outdentNode = (root: MindMapNode, nodeId: string): MindMapNode => {
  const parent = findParent(root, nodeId);
  if (!parent) return root;

  // Cannot outdent top-level topics (direct children of virtual-root)
  if (parent.id === 'virtual-root') return root;

  const grandparent = findParent(root, parent.id);
  if (!grandparent) return root;

  const nodeToMove = parent.children.find((c) => c.id === nodeId);
  if (!nodeToMove) return root;

  // 1. Remove node from parent's children
  const updatedParentChildren = parent.children.filter((c) => c.id !== nodeId);
  const updatedParent = { ...parent, children: updatedParentChildren };

  // 2. Insert into grandparent's children after parent
  const parentIndex = grandparent.children.findIndex((c) => c.id === parent.id);
  if (parentIndex === -1) return root;

  const finalGrandparentChildren = [...grandparent.children];
  finalGrandparentChildren.splice(parentIndex, 1, updatedParent); // Replace with updatedParent

  const outdentedNode = {
    ...nodeToMove,
    offset: grandparent.id === 'virtual-root'
      ? { x: (parent.offset?.x || 150) + 50, y: (parent.offset?.y || 200) + 80 } // Give position to top-level floating node
      : undefined
  };
  finalGrandparentChildren.splice(parentIndex + 1, 0, outdentedNode);

  return updateNodeChildren(root, grandparent.id, finalGrandparentChildren);
};

// Clear offsets of all nodes deeper than the virtual-root's direct children
export const clearSubNodeOffsets = (node: MindMapNode): MindMapNode => {
  if (node.id === 'virtual-root') {
    return {
      ...node,
      children: node.children.map(clearSubNodeOffsets)
    };
  }

  // Direct children of virtual-root keep their offsets (they are top-level topics)
  // All deeper children have their offsets cleared
  const clearDeeper = (n: MindMapNode): MindMapNode => {
    return {
      ...n,
      offset: undefined,
      children: n.children.map(clearDeeper)
    };
  };

  return {
    ...node,
    children: node.children.map(clearDeeper)
  };
};

// Add a relationship to the virtual-root node
export const addRelationship = (
  root: MindMapNode,
  fromId: string,
  toId: string
): MindMapNode => {
  if (root.id !== 'virtual-root') return root;
  const newRel: Relationship = {
    id: generateId(),
    fromId,
    toId
  };
  const currentRels = root.relationships || [];
  return {
    ...root,
    relationships: [...currentRels, newRel]
  };
};

// Delete a relationship from the virtual-root node
export const deleteRelationship = (
  root: MindMapNode,
  relId: string
): MindMapNode => {
  if (root.id !== 'virtual-root') return root;
  const currentRels = root.relationships || [];
  return {
    ...root,
    relationships: currentRels.filter((rel) => rel.id !== relId)
  };
};

// Update relationship text in the virtual-root node
export const updateRelationshipText = (
  root: MindMapNode,
  relId: string,
  text: string
): MindMapNode => {
  if (root.id !== 'virtual-root') return root;
  const currentRels = root.relationships || [];
  return {
    ...root,
    relationships: currentRels.map((rel) =>
      rel.id === relId ? { ...rel, text: text || undefined } : rel
    )
  };
};

// Calculate node depth relative to the visible root node (depth 0) (including summaries and summary children)
export const getNodeDepth = (
  node: MindMapNode,
  targetId: string,
  currentDepth: number = 0
): number | null => {
  if (node.id === targetId) {
    return currentDepth;
  }
  const isVirtual = node.id === 'virtual-root';
  const nextDepth = isVirtual ? currentDepth : currentDepth + 1;
  
  for (const child of node.children || []) {
    const d = getNodeDepth(child, targetId, nextDepth);
    if (d !== null) return d;
  }

  if (node.summaries) {
    for (const summary of node.summaries) {
      if (summary.id === targetId) {
        return nextDepth;
      }
      if (summary.children) {
        for (const child of summary.children) {
          const d = getNodeDepth(child, targetId, nextDepth + 1);
          if (d !== null) return d;
        }
      }
    }
  }

  return null;
};

// Apply style to all nodes at targetDepth (where root of visible map has depth 0) (including summaries)
export const applyStyleToDepth = (
  node: MindMapNode,
  targetDepth: number,
  styleToApply: Partial<MindMapNode['style']>,
  currentDepth: number = 0
): MindMapNode => {
  const isVirtual = node.id === 'virtual-root';
  const nextDepth = isVirtual ? currentDepth : currentDepth + 1;
  
  let updatedNode = { ...node };
  
  if (!isVirtual && currentDepth === targetDepth) {
    updatedNode.style = {
      ...updatedNode.style,
      ...styleToApply
    };
  }
  
  if (node.children && node.children.length > 0) {
    updatedNode.children = node.children.map((child) =>
      applyStyleToDepth(child, targetDepth, styleToApply, nextDepth)
    );
  }

  if (node.summaries && node.summaries.length > 0) {
    updatedNode.summaries = node.summaries.map((summary) => {
      let updatedSummary = { ...summary };
      if (nextDepth === targetDepth) {
        updatedSummary.style = {
          ...updatedSummary.style,
          ...styleToApply
        };
      }
      if (summary.children && summary.children.length > 0) {
        updatedSummary.children = summary.children.map((child) =>
          applyStyleToDepth(child, targetDepth, styleToApply, nextDepth + 1)
        );
      }
      return updatedSummary;
    });
  }
  
  return updatedNode;
};

// Add a summary to the parent node recursively
export const addSummary = (
  root: MindMapNode,
  parentId: string,
  newSummary: MindMapSummary
): MindMapNode => {
  if (root.id === parentId) {
    return {
      ...root,
      summaries: [...(root.summaries || []), newSummary]
    };
  }
  
  const newChildren = root.children.map((child) => addSummary(child, parentId, newSummary));
  
  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries.map((summary) => {
      if (summary.children) {
        return {
          ...summary,
          children: summary.children.map((child) => addSummary(child, parentId, newSummary))
        };
      }
      return summary;
    });
  }

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Update summary range recursively
export const updateSummaryRange = (
  root: MindMapNode,
  summaryId: string,
  startNodeId: string,
  endNodeId: string
): MindMapNode => {
  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries.map((summary) => {
      if (summary.id === summaryId) {
        return {
          ...summary,
          startNodeId,
          endNodeId
        };
      }
      if (summary.children) {
        return {
          ...summary,
          children: summary.children.map((child) => updateSummaryRange(child, summaryId, startNodeId, endNodeId))
        };
      }
      return summary;
    });
  }

  const newChildren = root.children.map((child) => updateSummaryRange(child, summaryId, startNodeId, endNodeId));

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Delete summary recursively
export const deleteSummary = (
  root: MindMapNode,
  summaryId: string
): MindMapNode => {
  let newSummaries = root.summaries;
  if (root.summaries) {
    newSummaries = root.summaries
      .filter((summary) => summary.id !== summaryId)
      .map((summary) => {
        if (summary.children) {
          return {
            ...summary,
            children: summary.children.map((child) => deleteSummary(child, summaryId))
          };
        }
        return summary;
      });
  }

  const newChildren = root.children.map((child) => deleteSummary(child, summaryId));

  return {
    ...root,
    children: newChildren,
    summaries: newSummaries
  };
};

// Sort all sub-node children arrays recursively by their current visual Y-axis positions (offset.y)
export const sortTreeByVisualY = (node: MindMapNode): MindMapNode => {
  if (!node.children || node.children.length === 0) {
    return node;
  }

  let sortedChildren: MindMapNode[];
  const structure = node.style?.structure || 'logic';

  if (node.id === 'root' && structure === 'mindmap') {
    // Sibling sorting for mindmap: separate left and right children
    const leftChildren = node.children.filter((_, idx) => idx % 2 === 0);
    const rightChildren = node.children.filter((_, idx) => idx % 2 !== 0);

    const sortedLeft = [...leftChildren].sort((a, b) => (a.offset?.y || 0) - (b.offset?.y || 0));
    const sortedRight = [...rightChildren].sort((a, b) => (a.offset?.y || 0) - (b.offset?.y || 0));

    sortedChildren = [];
    const maxLen = Math.max(sortedLeft.length, sortedRight.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < sortedLeft.length) sortedChildren.push(sortedLeft[i]);
      if (i < sortedRight.length) sortedChildren.push(sortedRight[i]);
    }
  } else {
    // Standard sorting by offset.y
    sortedChildren = [...node.children].sort((a, b) => (a.offset?.y || 0) - (b.offset?.y || 0));
  }

  // Recursively process children
  const processedChildren = sortedChildren.map(child => sortTreeByVisualY(child));

  return {
    ...node,
    children: processedChildren
  };
};
