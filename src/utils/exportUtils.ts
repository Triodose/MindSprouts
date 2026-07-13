import type { MindMapNode } from '../types/mindmap';
import html2canvas from 'html2canvas';

// Export tree to JSON file
export const exportToJson = (tree: MindMapNode, title: string) => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tree, null, 2));
  const downloadAnchor = document.createElement('a');
  const filename = `${title.replace(/\s+/g, '_')}_mindmap.json`;
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// Recursively convert node to Markdown bullet list
const treeToMarkdown = (node: MindMapNode, depth = 0): string => {
  if (node.id === 'virtual-root') {
    let md = '';
    node.children.forEach((child) => {
      md += treeToMarkdown(child, depth);
    });
    return md;
  }
  const indent = '  '.repeat(depth);
  let md = `${indent}- ${node.text}\n`;
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      md += treeToMarkdown(child, depth + 1);
    });
  }
  return md;
};

// Export tree to Markdown file
export const exportToMarkdown = (tree: MindMapNode, title: string) => {
  const mdContent = treeToMarkdown(tree);
  const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
  const downloadAnchor = document.createElement('a');
  const filename = `${title.replace(/\s+/g, '_')}_mindmap.md`;
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// Parse Markdown indented list into MindMapNode tree
export const parseMarkdownToTree = (markdownText: string): MindMapNode | null => {
  const lines = markdownText.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return null;

  interface ParseStackItem {
    node: MindMapNode;
    depth: number;
  }

  const stack: ParseStackItem[] = [];
  let rootNode: MindMapNode | null = null;

  const bulletRegex = /^(\s*)[-*+]\s+(.*)$/;

  lines.forEach((line) => {
    const match = line.match(bulletRegex);
    if (!match) return;

    const spaces = match[1].length;
    const text = match[2].trim();
    const node: MindMapNode = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      children: []
    };

    if (stack.length === 0) {
      rootNode = node;
      stack.push({ node, depth: spaces });
    } else {
      // Find the parent node based on spaces/depth
      while (stack.length > 0 && stack[stack.length - 1].depth >= spaces) {
        stack.pop();
      }

      if (stack.length > 0) {
        const parentItem = stack[stack.length - 1];
        parentItem.node.children.push(node);
        stack.push({ node, depth: spaces });
      } else {
        // Fallback if formatting is weird
        if (rootNode) {
          rootNode.children.push(node);
        }
      }
    }
  });

  return rootNode;
};

// Export canvas layout as PNG image
export const exportToPng = async (element: HTMLElement, title: string) => {
  try {
    // Temporarily reset zoom and pan for capturing full tree correctly
    const originalTransform = element.style.transform;
    element.style.transform = 'none';

    // Find bounding box of all elements in the tree
    const rect = element.getBoundingClientRect();
    
    const canvas = await html2canvas(element, {
      backgroundColor: 'transparent',
      logging: false,
      useCORS: true,
      scale: 2, // Double resolution for premium sharpness
      width: rect.width + 100, // Add padding
      height: rect.height + 100,
      x: rect.left - 50,
      y: rect.top - 50
    });

    // Restore original transform
    element.style.transform = originalTransform;

    const imgData = canvas.toDataURL('image/png');
    const downloadAnchor = document.createElement('a');
    const filename = `${title.replace(/\s+/g, '_')}_mindmap.png`;
    downloadAnchor.setAttribute('href', imgData);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Failed to export image:', err);
    alert('匯出圖片時發生錯誤，請重試。');
  }
};
