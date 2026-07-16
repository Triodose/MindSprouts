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
export const exportToPng = async (element: HTMLElement, title: string, errorPrefix = '匯出圖片時發生錯誤：') => {
  console.log('exportToPng called with element:', element, 'title:', title);
  try {
    const realApp = element.closest('.mindmap-app') as HTMLElement;
    const themeBg = realApp ? window.getComputedStyle(realApp).backgroundColor : '#1d2731';
    console.log('themeBg:', themeBg);

    // Find the canvas-transform element that has the zoom/pan transform
    const transformEl = element.closest('.canvas-transform') as HTMLElement;
    const originalTransform = transformEl ? transformEl.style.transform : '';
    console.log('originalTransform:', originalTransform);

    // 1. Temporarily clear transform on the parent canvas-transform so we get accurate unscaled layout coordinates
    if (transformEl) {
      transformEl.style.transform = 'none';
    }

    const nodeCards = element.querySelectorAll('.node-card');
    console.log('Found node cards count:', nodeCards.length);
    
    const containerRect = element.getBoundingClientRect();
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodeCards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      // Coordinates relative to .tree-container (element)
      const x1 = cardRect.left - containerRect.left;
      const x2 = cardRect.right - containerRect.left;
      const y1 = cardRect.top - containerRect.top;
      const y2 = cardRect.bottom - containerRect.top;

      if (x1 < minX) minX = x1;
      if (x2 > maxX) maxX = x2;
      if (y1 < minY) minY = y1;
      if (y2 > maxY) maxY = y2;
    });

    console.log('Bounding box computed:', { minX, maxX, minY, maxY });

    // Restore original transform immediately
    if (transformEl) {
      transformEl.style.transform = originalTransform;
    }

    // Fallback if no nodes are detected
    if (nodeCards.length === 0 || minX === Infinity) {
      console.log('Fallback triggered: no nodes detected.');
      const canvas = await html2canvas(element, {
        backgroundColor: themeBg,
        logging: true,
        useCORS: true,
        scale: 2,
        onclone: (clonedDoc) => {
          if (realApp) {
            clonedDoc.body.style.cssText = realApp.style.cssText;
            clonedDoc.body.style.backgroundColor = themeBg;
            clonedDoc.body.style.color = window.getComputedStyle(realApp).color;
          }
        }
      });
      triggerDownload(canvas, title);
      return;
    }

    // Add a 60px padding around the mindmap boundaries
    const padding = 60;
    const captureWidth = (maxX - minX) + padding * 2;
    const captureHeight = (maxY - minY) + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    console.log('Capture bounds:', { captureWidth, captureHeight, offsetX, offsetY });

    // 2. Capture using html2canvas by shifting positioning to absolute left/top in cloned elements
    console.log('Starting html2canvas capture...');
    const canvas = await html2canvas(element, {
      backgroundColor: themeBg,
      logging: true, // Enable html2canvas internal logs for debugging
      useCORS: true,
      scale: 2,
      onclone: (clonedDoc, clonedEl) => {
        console.log('html2canvas onclone callback triggered.');
        // clonedEl is the cloned tree-container (since it is the root target element)
        const clonedContainer = (clonedEl as HTMLElement) || (clonedDoc.querySelector('.tree-container') as HTMLElement);
        if (!clonedContainer) {
          console.warn('Cloned root tree-container not found in clone!');
          return;
        }
        
        if (realApp) {
          // Set all variables and backgrounds on the cloned body so they inherit down
          clonedDoc.body.style.cssText = realApp.style.cssText;
          clonedDoc.body.style.backgroundColor = themeBg;
          clonedDoc.body.style.color = window.getComputedStyle(realApp).color;

          // Force the cloned container to match the exact cropped mindmap dimensions
          clonedContainer.style.width = `${captureWidth}px`;
          clonedContainer.style.height = `${captureHeight}px`;
          clonedContainer.style.position = 'relative';
          clonedContainer.style.overflow = 'hidden';
          clonedContainer.style.backgroundColor = themeBg;

          // Shift all direct absolute children (nodes & SVGs) to center inside clonedContainer
          const children = Array.from(clonedContainer.children) as HTMLElement[];
          children.forEach((child) => {
            if (child.classList.contains('svg-connections')) {
              // Set explicit pixel dimensions and viewBox mapping on the SVG element to prevent html2canvas layout bugs and clipping
              const clonedSvg = child as unknown as SVGElement;
              clonedSvg.setAttribute('width', captureWidth.toString());
              clonedSvg.setAttribute('height', captureHeight.toString());
              clonedSvg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${captureWidth} ${captureHeight}`);
              clonedSvg.style.width = `${captureWidth}px`;
              clonedSvg.style.height = `${captureHeight}px`;
              clonedSvg.style.left = '0px';
              clonedSvg.style.top = '0px';
              clonedSvg.style.position = 'absolute';
            } else {
              // Shift normal HTML node branches and summary trees
              const originalLeft = parseFloat(child.style.left) || 0;
              const originalTop = parseFloat(child.style.top) || 0;
              child.style.left = `${originalLeft + offsetX}px`;
              child.style.top = `${originalTop + offsetY}px`;
            }
          });
          
          console.log('onclone styling, SVG viewBox mapping, and offsets successfully applied.');
        }
      }
    });

    console.log('html2canvas rendering completed successfully. Canvas size:', canvas.width, 'x', canvas.height);
    triggerDownload(canvas, title);
  } catch (err) {
    console.error('Failed to export image:', err);
    alert(errorPrefix + (err as Error).message);
  }
};

const triggerDownload = (canvas: HTMLCanvasElement, title: string) => {
  const imgData = canvas.toDataURL('image/png');
  const downloadAnchor = document.createElement('a');
  const filename = `${title.replace(/\s+/g, '_')}_mindmap.png`;
  downloadAnchor.setAttribute('href', imgData);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
