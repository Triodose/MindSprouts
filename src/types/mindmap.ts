export interface NodeStyle {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'long-dashed' | 'dotted';
  fontSize?: string;
  fontWeight?: string;
  shape?: 'rounded' | 'rectangle' | 'underlined' | 'diamond' | 'circle';
  structure?: 'logic' | 'org' | 'mindmap' | 'logic-left' | 'tree' | 'brace' | 'timeline' | 'fishbone';
  lineStyle?: 'curve' | 'straight' | 'tapered';
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  text?: string;
}

export interface BoundaryStyle {
  title?: string;
  fillColor?: string;
  borderColor?: string;
  borderStyle?: 'dashed' | 'solid';
}

export interface MindMapNode {
  id: string;
  text: string;
  isCollapsed?: boolean;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  children: MindMapNode[];
  style?: NodeStyle;
  offset?: { x: number; y: number }; // Custom drag offset
  priority?: number;
  progress?: number;
  labels?: string[];
  note?: string;
  relationships?: Relationship[];
  boundary?: BoundaryStyle;
  themeId?: string; // Theme selection saved at root node level
  summaries?: MindMapSummary[];
  flag?: string;
  link?: string;
  image?: string;
  levelStyles?: Record<number, NodeStyle>;
}

export interface MindMapSummary {
  id: string;
  startNodeId: string;
  endNodeId: string;
  text: string;
  style?: NodeStyle;
  children?: MindMapNode[]; // Can have sub-branches
}

export interface SummaryPosition {
  id: string;
  x: number;
  y: number;
  direction: 'left' | 'right' | 'down';
  node: MindMapNode;
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface MindMapTheme {
  id: string;
  name: string;
  background: string;               // Canvas background color
  
  // Root node default styles
  rootBackground: string;
  rootColor: string;
  rootBorder: string;
  
  // Sub-nodes default styles
  nodeDefaultBackground: string;
  nodeDefaultColor: string;
  nodeDefaultBorder: string;
  
  // Connection line color
  lineColor: string;
  
  // Relationship lines colors
  relLineColor: string;
  relLineActiveColor: string;
  relLabelBackground: string;
  relLabelColor: string;

  accentColor: string;             // Highlight active state accent
  textColor: string;                // Text color fallback (for canvas labels)
  glassBackground: string;          // Deprecated/UI fallback
  glassBorder: string;              // Deprecated/UI fallback
  branchColors?: string[];          // Rainbow line colors
  levelBackgrounds?: string[];      // Background fill colors for level 0, 1, 2, 3, 4+
  levelColors?: string[];           // Text colors for level 0, 1, 2, 3, 4+
  levelBorders?: string[];          // Border colors for level 0, 1, 2, 3, 4+
  isFilledTheme?: boolean;          // Flag to indicate background is filled
}

export interface HistoryState {
  past: MindMapNode[];
  present: MindMapNode;
  future: MindMapNode[];
}

export interface MindMapDocument {
  id: string;
  title: string;
  content: MindMapNode;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}
