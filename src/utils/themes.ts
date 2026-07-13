import type { MindMapTheme } from '../types/mindmap';

export const THEMES: MindMapTheme[] = [
  {
    id: 'moody-forest',
    name: 'Moody Forest (靜謐森林)',
    background: '#2f3436',
    
    // Root Node
    rootBackground: '#2f3436',
    rootColor: '#ffffff',
    rootBorder: '#8b9467',

    // Sub Nodes
    nodeDefaultBackground: '#455a64',
    nodeDefaultColor: '#c9e4ca',
    nodeDefaultBorder: '#4c5154',

    // Lines
    lineColor: '#8b9467',

    // Relationship Lines
    relLineColor: '#8b9467',
    relLineActiveColor: '#c9e4ca',
    relLabelBackground: '#455a64',
    relLabelColor: '#ffffff',

    accentColor: '#8b9467',
    textColor: '#c9e4ca',
    glassBackground: 'rgba(69, 90, 100, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    branchColors: ['#8b9467', '#c9e4ca', '#455a64', '#c9c4b5', '#a0aec0']
  },
  {
    id: 'deep-abyssal',
    name: 'Deep Abyssal (深海之光)',
    background: '#032b44',
    
    // Root Node
    rootBackground: '#032b44',
    rootColor: '#ffffff',
    rootBorder: '#34a8ff',

    // Sub Nodes
    nodeDefaultBackground: '#0f354c',
    nodeDefaultColor: '#66cccc',
    nodeDefaultBorder: '#1a4660',

    // Lines
    lineColor: '#66cccc',

    // Relationship Lines
    relLineColor: '#66cccc',
    relLineActiveColor: '#34a8ff',
    relLabelBackground: '#0f354c',
    relLabelColor: '#ffffff',

    accentColor: '#34a8ff',
    textColor: '#66cccc',
    glassBackground: 'rgba(15, 53, 76, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    branchColors: ['#34a8ff', '#66cccc', '#8b9467', '#4c5154', '#8b9467']
  },
  {
    id: 'sakura-pastel',
    name: 'Sakura Pastel (暮櫻粉彩)',
    background: '#fffdfd',
    
    // Root Node
    rootBackground: '#ffffff',
    rootColor: '#964b00',
    rootBorder: '#ffb6c1',

    // Sub Nodes
    nodeDefaultBackground: '#ffffff',
    nodeDefaultColor: '#4a3e3d',
    nodeDefaultBorder: '#ffc5c5',

    // Lines
    lineColor: '#c7b8ea',

    // Relationship Lines
    relLineColor: '#c7b8ea',
    relLineActiveColor: '#ffb6c1',
    relLabelBackground: '#ffffff',
    relLabelColor: '#4a3e3d',

    accentColor: '#ffb6c1',
    textColor: '#964b00',
    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(255, 182, 193, 0.15)',
    branchColors: ['#ffb6c1', '#c7b8ea', '#c9e4ca', '#ffc5c5', '#964b00']
  },
  {
    id: 'sunset-oasis',
    name: 'Sunset Oasis (落日綠洲)',
    background: '#fdfbf7',
    
    // Root Node
    rootBackground: '#ffffff',
    rootColor: '#2e865f',
    rootBorder: '#ffc499',

    // Sub Nodes
    nodeDefaultBackground: '#ffffff',
    nodeDefaultColor: '#2d3748',
    nodeDefaultBorder: '#f7d2c4',

    // Lines
    lineColor: '#3498db',

    // Relationship Lines
    relLineColor: '#8b9467',
    relLineActiveColor: '#ffc499',
    relLabelBackground: '#ffffff',
    relLabelColor: '#2d3748',

    accentColor: '#2e865f',
    textColor: '#2d3748',
    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(46, 134, 95, 0.1)',
    branchColors: ['#2e865f', '#ffc499', '#3498db', '#8b9467', '#f7d2c4']
  },
  {
    id: 'eldritch-ruins',
    name: 'Eldritch Ruins (古神遺跡)',
    background: '#1f212a',
    
    // Root Node
    rootBackground: '#1f212a',
    rootColor: '#ffc499',
    rootBorder: '#3b3f54',

    // Sub Nodes
    nodeDefaultBackground: '#2c2e3a',
    nodeDefaultColor: '#e2e8f0',
    nodeDefaultBorder: '#4e5338',

    // Lines
    lineColor: '#8b9467',

    // Relationship Lines
    relLineColor: '#8b9467',
    relLineActiveColor: '#ffc499',
    relLabelBackground: '#2c2e3a',
    relLabelColor: '#ffffff',

    accentColor: '#ffc499',
    textColor: '#e2e8f0',
    glassBackground: 'rgba(44, 46, 58, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    branchColors: ['#ffc499', '#66cccc', '#8b9467', '#3b3f54', '#4e5338']
  },
  {
    id: 'nordic-warmth',
    name: 'Nordic Warmth (北歐暖沙)',
    background: '#f7f4e9',
    
    // Root Node
    rootBackground: '#ffffff',
    rootColor: '#3a3d41',
    rootBorder: '#c9c4b5',

    // Sub Nodes
    nodeDefaultBackground: '#ffffff',
    nodeDefaultColor: '#2d3748',
    nodeDefaultBorder: '#c9c4b5',

    // Lines
    lineColor: '#8b9467',

    // Relationship Lines
    relLineColor: '#8b9467',
    relLineActiveColor: '#3a3d41',
    relLabelBackground: '#ffffff',
    relLabelColor: '#2d3748',

    accentColor: '#3a3d41',
    textColor: '#2d3748',
    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(139, 148, 103, 0.1)',
    branchColors: ['#3a3d41', '#8b9467', '#455a64', '#c9c4b5', '#a0aec0']
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire (皇家藍金)',
    background: '#0b132b',
    
    // Root Node
    rootBackground: '#0b132b',
    rootColor: '#ffffff',
    rootBorder: '#d4af80',

    // Sub Nodes
    nodeDefaultBackground: '#1c2541',
    nodeDefaultColor: '#f1f5f9',
    nodeDefaultBorder: '#6e7f80',

    // Lines
    lineColor: '#9fb6cd',

    // Relationship Lines
    relLineColor: '#9fb6cd',
    relLineActiveColor: '#d4af80',
    relLabelBackground: '#1c2541',
    relLabelColor: '#ffffff',

    accentColor: '#d4af80',
    textColor: '#f1f5f9',
    glassBackground: 'rgba(28, 37, 65, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    branchColors: ['#d4af80', '#9fb6cd', '#a79984', '#002366', '#3b82f6']
  },
  {
    id: 'jungle-paradise',
    name: 'Jungle Paradise (熱帶叢林)',
    background: '#ffffff',
    
    // Root Node
    rootBackground: '#ffffff',
    rootColor: '#03a9f4',
    rootBorder: '#34c759',

    // Sub Nodes
    nodeDefaultBackground: '#f8fafc',
    nodeDefaultColor: '#0f172a',
    nodeDefaultBorder: '#e2e8f0',

    // Lines
    lineColor: '#34c759',

    // Relationship Lines
    relLineColor: '#34c759',
    relLineActiveColor: '#03a9f4',
    relLabelBackground: '#f8fafc',
    relLabelColor: '#0f172a',

    accentColor: '#03a9f4',
    textColor: '#0f172a',
    glassBackground: 'rgba(248, 250, 252, 0.8)',
    glassBorder: 'rgba(3, 169, 244, 0.1)',
    branchColors: ['#03a9f4', '#34c759', '#f7dc6f', '#ffc67d', '#8bc34a']
  },
  {
    id: 'icelandic-breeze',
    name: 'Icelandic Breeze (冰島微風)',
    background: '#f2f8f4',
    
    // Root Node
    rootBackground: '#ffffff',
    rootColor: '#1e293b',
    rootBorder: '#a7c6ed',

    // Sub Nodes
    nodeDefaultBackground: '#ffffff',
    nodeDefaultColor: '#334155',
    nodeDefaultBorder: '#d4e1e1',

    // Lines
    lineColor: '#b6dcdc',

    // Relationship Lines
    relLineColor: '#b6dcdc',
    relLineActiveColor: '#e5b7d1',
    relLabelBackground: '#ffffff',
    relLabelColor: '#334155',

    accentColor: '#a7c6ed',
    textColor: '#334155',
    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(167, 198, 237, 0.1)',
    branchColors: ['#a7c6ed', '#e5b7d1', '#b6dcdc', '#94a3b8', '#cbd5e1']
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon (極客霓虹)',
    background: '#0f111a',
    
    // Root Node
    rootBackground: '#0f111a',
    rootColor: '#ffffff',
    rootBorder: '#6c5ce7',

    // Sub Nodes
    nodeDefaultBackground: '#1a1c28',
    nodeDefaultColor: '#f7dc6f',
    nodeDefaultBorder: '#2e4053',

    // Lines
    lineColor: '#3498db',

    // Relationship Lines
    relLineColor: '#3498db',
    relLineActiveColor: '#f7dc6f',
    relLabelBackground: '#1a1c28',
    relLabelColor: '#ffffff',

    accentColor: '#6c5ce7',
    textColor: '#f7dc6f',
    glassBackground: 'rgba(26, 28, 40, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    branchColors: ['#6c5ce7', '#f7dc6f', '#3498db', '#e2ebf0', '#8b9467']
  }
];

export const DEFAULT_THEME = THEMES[0];
