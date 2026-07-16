import type { MindMapTheme } from '../types/mindmap';

export const THEMES: MindMapTheme[] = [
  {
    id: 'nature-earth',
    name: 'Nature Earth (自然大地)',
    background: '#F9F6F0',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#5C4033',
    rootColor: '#ffffff',
    rootBorder: '#5C4033',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#8B4513',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#8B4513',

    // Level-specific styles (fallback)
    levelBackgrounds: [
      '#5C4033', '#8B4513', '#CD853F', '#DEB887', '#F5F5DC'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#5C4033', '#5C4033'
    ],
    levelBorders: [
      '#5C4033', '#8B4513', '#CD853F', '#DEB887', '#F5F5DC'
    ],

    // Lines (Structure Line: Saddle Brown)
    lineColor: '#8B4513',

    // Relationship Lines
    relLineColor: '#8B4513',
    relLineActiveColor: '#CD853F',
    relLabelBackground: '#DEB887',
    relLabelColor: '#5C4033',

    accentColor: '#8B4513',
    textColor: '#5C4033',
    glassBackground: 'rgba(222, 184, 135, 0.15)',
    glassBorder: 'rgba(139, 69, 19, 0.15)',
    
    // Branch-specific colors (Rich earth tones)
    branchColors: ['#8B4513', '#CD853F', '#A0522D', '#D4A373', '#DEB887']
  },
  {
    id: 'morandi-classic',
    name: 'Morandi Classic (經典莫蘭迪)',
    background: '#F5F5F5',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#3E3846',
    rootColor: '#ffffff',
    rootBorder: '#3E3846',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#5F506B',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#5F506B',

    // Level-specific styles
    levelBackgrounds: [
      '#3E3846', '#5F506B', '#8C7B83', '#A6808C', '#EAEAEA'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#3E3846'
    ],
    levelBorders: [
      '#3E3846', '#5F506B', '#8C7B83', '#A6808C', '#EAEAEA'
    ],

    // Lines
    lineColor: '#5F506B',

    // Relationship Lines
    relLineColor: '#5F506B',
    relLineActiveColor: '#8C7B83',
    relLabelBackground: '#A6808C',
    relLabelColor: '#ffffff',

    accentColor: '#5F506B',
    textColor: '#3E3846',
    glassBackground: 'rgba(166, 128, 140, 0.15)',
    glassBorder: 'rgba(95, 80, 107, 0.15)',
    
    // Branch-specific colors (Grayish pastel Morandi palette)
    branchColors: ['#5F506B', '#8C7B83', '#A6808C', '#8A9A86', '#BCAAA4']
  },
  {
    id: 'japanese-traditional',
    name: 'Japanese Traditional (日式傳統)',
    background: '#F7F8F6',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#3E3846',
    rootColor: '#ffffff',
    rootBorder: '#3E3846',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#5F7164',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#5F7164',

    // Level-specific styles
    levelBackgrounds: [
      '#3E3846', '#5F7164', '#8A9A86', '#B0B8B5', '#EAEAEA'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#3E3846', '#3E3846'
    ],
    levelBorders: [
      '#3E3846', '#5F7164', '#8A9A86', '#B0B8B5', '#EAEAEA'
    ],

    // Lines
    lineColor: '#5F7164',

    // Relationship Lines
    relLineColor: '#5F7164',
    relLineActiveColor: '#8A9A86',
    relLabelBackground: '#B0B8B5',
    relLabelColor: '#3E3846',

    accentColor: '#5F7164',
    textColor: '#5F7164',
    glassBackground: 'rgba(138, 154, 134, 0.15)',
    glassBorder: 'rgba(95, 113, 100, 0.15)',
    
    // Branch-specific colors (Moss green, soft pink rose, stone gray)
    branchColors: ['#5F7164', '#8A9A86', '#BCAAA4', '#A6808C', '#8C7B83']
  },
  {
    id: 'spring-pastel',
    name: 'Spring (春天)',
    background: '#FFFDFB',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#E8A598',
    rootColor: '#ffffff',
    rootBorder: '#E8A598',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#FFB7B2',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#FFB7B2',

    // Level-specific styles
    levelBackgrounds: [
      '#E8A598', '#FFB7B2', '#FFDAC1', '#FFE5EC', '#FFF5F7'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#7A3E37', '#7A3E37', '#7A3E37'
    ],
    levelBorders: [
      '#E8A598', '#FFB7B2', '#FFDAC1', '#FFE5EC', '#FFF5F7'
    ],

    // Lines
    lineColor: '#E8A598',

    // Relationship Lines
    relLineColor: '#E8A598',
    relLineActiveColor: '#FFB7B2',
    relLabelBackground: '#FFDAC1',
    relLabelColor: '#7A3E37',

    accentColor: '#E8A598',
    textColor: '#7A3E37',
    glassBackground: 'rgba(255, 183, 178, 0.15)',
    glassBorder: 'rgba(232, 165, 152, 0.15)',
    
    // Branch-specific colors (Vibrant tulip, yellow flower, creek blue, sakura pink)
    branchColors: ['#E8A598', '#FAD02C', '#95E1D3', '#C7CEEA', '#FFB7B2']
  },
  {
    id: 'summer-vibrant',
    name: 'Summer (夏天)',
    background: '#F4FAFB',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#22577A',
    rootColor: '#ffffff',
    rootBorder: '#22577A',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#38A3A5',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#38A3A5',

    // Level-specific styles
    levelBackgrounds: [
      '#22577A', '#38A3A5', '#00B4D8', '#90E0EF', '#E2F6F9'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#22577A', '#22577A'
    ],
    levelBorders: [
      '#22577A', '#38A3A5', '#00B4D8', '#90E0EF', '#E2F6F9'
    ],

    // Lines
    lineColor: '#38A3A5',

    // Relationship Lines
    relLineColor: '#38A3A5',
    relLineActiveColor: '#00B4D8',
    relLabelBackground: '#90E0EF',
    relLabelColor: '#22577A',

    accentColor: '#38A3A5',
    textColor: '#22577A',
    glassBackground: 'rgba(56, 163, 165, 0.15)',
    glassBorder: 'rgba(34, 87, 122, 0.15)',
    
    // Branch-specific colors (Sunny red, orange, sunflower yellow, ocean cyan, palm green)
    branchColors: ['#FF5964', '#FF9F1C', '#FFE74C', '#00B4D8', '#57CC99']
  },
  {
    id: 'autumn-warmth',
    name: 'Autumn (秋天)',
    background: '#FCF9F5',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#CD5A01',
    rootColor: '#ffffff',
    rootBorder: '#CD5A01',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#E36414',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#E36414',

    // Level-specific styles
    levelBackgrounds: [
      '#CD5A01', '#E36414', '#FB8B24', '#D4A373', '#FAEDCD'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#9A031E'
    ],
    levelBorders: [
      '#CD5A01', '#E36414', '#FB8B24', '#D4A373', '#FAEDCD'
    ],

    // Lines
    lineColor: '#E36414',

    // Relationship Lines
    relLineColor: '#E36414',
    relLineActiveColor: '#FB8B24',
    relLabelBackground: '#D4A373',
    relLabelColor: '#ffffff',

    accentColor: '#E36414',
    textColor: '#9A031E',
    glassBackground: 'rgba(212, 163, 115, 0.15)',
    glassBorder: 'rgba(205, 90, 1, 0.15)',
    
    // Branch-specific colors (Maple red, pumpkin orange, amber, red wine)
    branchColors: ['#9A031E', '#CD5A01', '#E36414', '#FB8B24', '#8F2D56']
  },
  {
    id: 'winter-frost',
    name: 'Winter (冬天)',
    background: '#F5FAF9',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#1D3557',
    rootColor: '#ffffff',
    rootBorder: '#1D3557',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#457B9D',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#457B9D',

    // Level-specific styles
    levelBackgrounds: [
      '#1D3557', '#457B9D', '#A8DADC', '#D8E2DC', '#E0FBFC'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#1D3557', '#1D3557', '#1D3557'
    ],
    levelBorders: [
      '#1D3557', '#457B9D', '#A8DADC', '#D8E2DC', '#E0FBFC'
    ],

    // Lines
    lineColor: '#457B9D',

    // Relationship Lines
    relLineColor: '#457B9D',
    relLineActiveColor: '#A8DADC',
    relLabelBackground: '#D8E2DC',
    relLabelColor: '#1D3557',

    accentColor: '#457B9D',
    textColor: '#1D3557',
    glassBackground: 'rgba(168, 218, 220, 0.15)',
    glassBorder: 'rgba(69, 123, 157, 0.15)',
    
    // Branch-specific colors (Night blue, Christmas red, Pine green, Lake blue, Twig purple)
    branchColors: ['#1D3557', '#E63946', '#2A9D8F', '#457B9D', '#4A4E69']
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom (櫻花)',
    background: '#FFF9FB',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#C71585',
    rootColor: '#ffffff',
    rootBorder: '#C71585',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#DB7093',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#DB7093',

    // Level-specific styles
    levelBackgrounds: [
      '#C71585', '#DB7093', '#FF69B4', '#FFB6C1', '#FFF0F5'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#C71585'
    ],
    levelBorders: [
      '#C71585', '#DB7093', '#FF69B4', '#FFB6C1', '#FFF0F5'
    ],

    // Lines
    lineColor: '#DB7093',

    // Relationship Lines
    relLineColor: '#DB7093',
    relLineActiveColor: '#FF69B4',
    relLabelBackground: '#FFB6C1',
    relLabelColor: '#ffffff',

    accentColor: '#DB7093',
    textColor: '#C71585',
    glassBackground: 'rgba(255, 182, 193, 0.15)',
    glassBorder: 'rgba(219, 112, 147, 0.15)',
    
    // Branch-specific colors (Night sakura magenta, rouge pink, hot rose, violet sakura, leaf green)
    branchColors: ['#C71585', '#DB7093', '#FF69B4', '#E6A8D7', '#D8F3DC']
  },
  {
    id: 'starry-night',
    name: 'Starry Night (星空)',
    background: '#F1F3FA',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#03045E',
    rootColor: '#ffffff',
    rootBorder: '#03045E',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#023E8A',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#023E8A',

    // Level-specific styles
    levelBackgrounds: [
      '#03045E', '#023E8A', '#0077B6', '#0096C7', '#E0F2FE'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#03045E'
    ],
    levelBorders: [
      '#03045E', '#023E8A', '#0077B6', '#0096C7', '#E0F2FE'
    ],

    // Lines
    lineColor: '#0077B6',

    // Relationship Lines
    relLineColor: '#0077B6',
    relLineActiveColor: '#0096C7',
    relLabelBackground: '#E0AA3E',
    relLabelColor: '#03045E',

    accentColor: '#0077B6',
    textColor: '#03045E',
    glassBackground: 'rgba(0, 119, 182, 0.15)',
    glassBorder: 'rgba(2, 62, 138, 0.15)',
    
    // Branch-specific colors (Deep space blue, nebula purple, violet galaxy, Polaris gold, star yellow)
    branchColors: ['#03045E', '#7209B7', '#B5179E', '#FFB703', '#0077B6']
  },
  {
    id: 'meadow-green',
    name: 'Meadow (草地)',
    background: '#F6F9F5',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#132A13',
    rootColor: '#ffffff',
    rootBorder: '#132A13',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#31572C',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#31572C',

    // Level-specific styles
    levelBackgrounds: [
      '#132A13', '#31572C', '#4F772D', '#90A955', '#D8F3DC'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#132A13'
    ],
    levelBorders: [
      '#132A13', '#31572C', '#4F772D', '#90A955', '#D8F3DC'
    ],

    // Lines
    lineColor: '#31572C',

    // Relationship Lines
    relLineColor: '#31572C',
    relLineActiveColor: '#4F772D',
    relLabelBackground: '#90A955',
    relLabelColor: '#ffffff',

    accentColor: '#31572C',
    textColor: '#132A13',
    glassBackground: 'rgba(144, 169, 85, 0.15)',
    glassBorder: 'rgba(49, 87, 44, 0.15)',
    
    // Branch-specific colors (Forest green, moss green, evergreen, olive, meadow green)
    branchColors: ['#132A13', '#31572C', '#588157', '#4F772D', '#90A955']
  },
  {
    id: 'future-sci-fi',
    name: 'Future (未來)',
    background: '#F8FAFC',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#3A0CA3',
    rootColor: '#ffffff',
    rootBorder: '#3A0CA3',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#7B2CBF',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#7B2CBF',

    // Level-specific styles
    levelBackgrounds: [
      '#3A0CA3', '#7B2CBF', '#9D4EDD', '#C082F8', '#F3E8FF'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#3A0CA3'
    ],
    levelBorders: [
      '#3A0CA3', '#7B2CBF', '#9D4EDD', '#C082F8', '#F3E8FF'
    ],

    // Lines
    lineColor: '#7B2CBF',

    // Relationship Lines
    relLineColor: '#7B2CBF',
    relLineActiveColor: '#9D4EDD',
    relLabelBackground: '#C082F8',
    relLabelColor: '#3A0CA3',

    accentColor: '#7B2CBF',
    textColor: '#3A0CA3',
    glassBackground: 'rgba(123, 44, 191, 0.15)',
    glassBorder: 'rgba(58, 12, 163, 0.15)',
    
    // Branch-specific colors (Quantum purple, electron pink, tech blue, neon green, warning orange)
    branchColors: ['#7B2CBF', '#FF007F', '#01B4E4', '#00F5D4', '#FF5400']
  },
  {
    id: 'space-galaxy',
    name: 'Space / Galaxy (太空)',
    background: '#F7FFF7', // Comet light white canvas background
    isFilledTheme: true,
    
    // Root Node (NASA Blue)
    rootBackground: '#0B3C5D',
    rootColor: '#ffffff',
    rootBorder: '#0B3C5D',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#328CC1',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#328CC1',

    // Level-specific styles
    levelBackgrounds: [
      '#0B3C5D', '#328CC1', '#5FAAD4', '#98D7C2', '#F7FFF7'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#0B3C5D', '#0B3C5D'
    ],
    levelBorders: [
      '#0B3C5D', '#328CC1', '#5FAAD4', '#98D7C2', '#F7FFF7'
    ],

    // Lines (Structure Line: Space Neutron Gray-Blue)
    lineColor: '#1D2731',

    // Relationship Lines
    relLineColor: '#1D2731',
    relLineActiveColor: '#328CC1',
    relLabelBackground: '#98D7C2',
    relLabelColor: '#1D2731',

    accentColor: '#328CC1',
    textColor: '#1D2731',
    glassBackground: 'rgba(50, 140, 193, 0.15)',
    glassBorder: 'rgba(11, 60, 93, 0.15)',
    
    // Branch-specific colors (NASA blue, Satellite blue, Venus gold, Mars red, Supernova purple, Uranus green, Nebula dust)
    branchColors: ['#0B3C5D', '#328CC1', '#D9B310', '#FF6B6B', '#AA00FF', '#4ECDC4', '#98D7C2']
  },
  {
    id: 'mysterious-magic',
    name: 'Mysterious (神秘)',
    background: '#F6F3F7',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#0F001A',
    rootColor: '#ffffff',
    rootBorder: '#0F001A',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#31004A',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#31004A',

    // Level-specific styles
    levelBackgrounds: [
      '#0F001A', '#31004A', '#4C0070', '#7F00FF', '#A393BF'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#0F001A'
    ],
    levelBorders: [
      '#0F001A', '#31004A', '#4C0070', '#7F00FF', '#A393BF'
    ],

    // Lines
    lineColor: '#4C0070',

    // Relationship Lines
    relLineColor: '#4C0070',
    relLineActiveColor: '#7F00FF',
    relLabelBackground: '#A393BF',
    relLabelColor: '#0F001A',

    accentColor: '#4C0070',
    textColor: '#0F001A',
    glassBackground: 'rgba(76, 0, 112, 0.15)',
    glassBorder: 'rgba(49, 0, 74, 0.15)',
    
    // Branch-specific colors (Abyss purple, witch purple, burgundy red, blood red, antique gold)
    branchColors: ['#31004A', '#4C0070', '#800020', '#4A0E17', '#D4AF37']
  },
  {
    id: 'candy-rainbow',
    name: 'Candy Rainbow (多彩糖果)',
    background: '#FCF8FF',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#FF5E7E',
    rootColor: '#ffffff',
    rootBorder: '#FF5E7E',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#FF9F43',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#FF9F43',

    // Level-specific styles
    levelBackgrounds: [
      '#FF5E7E', '#FF9F43', '#FECA57', '#1DD1A1', '#48DBFB'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'
    ],
    levelBorders: [
      '#FF5E7E', '#FF9F43', '#FECA57', '#1DD1A1', '#48DBFB'
    ],

    // Lines
    lineColor: '#FF9F43',

    // Relationship Lines
    relLineColor: '#FF9F43',
    relLineActiveColor: '#FF5E7E',
    relLabelBackground: '#FECA57',
    relLabelColor: '#5C4033',

    accentColor: '#FF5E7E',
    textColor: '#FF5E7E',
    glassBackground: 'rgba(255, 94, 126, 0.15)',
    glassBorder: 'rgba(255, 159, 67, 0.15)',
    
    // Branch-specific colors (Pink, orange, yellow, green, cyan, purple, magenta)
    branchColors: ['#FF5E7E', '#FF9F43', '#FECA57', '#1DD1A1', '#48DBFB', '#9B5DE5', '#F15BB5']
  },
  {
    id: 'ocean-coral',
    name: 'Ocean Coral (海洋珊瑚)',
    background: '#F0FBFC',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#008080',
    rootColor: '#ffffff',
    rootBorder: '#008080',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#FF7F50',
    nodeDefaultColor: '#ffffff',
    nodeDefaultBorder: '#FF7F50',

    // Level-specific styles
    levelBackgrounds: [
      '#008080', '#FF7F50', '#20B2AA', '#4682B4', '#EAEAEA'
    ],
    levelColors: [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#008080'
    ],
    levelBorders: [
      '#008080', '#FF7F50', '#20B2AA', '#4682B4', '#EAEAEA'
    ],

    // Lines
    lineColor: '#008080',

    // Relationship Lines
    relLineColor: '#008080',
    relLineActiveColor: '#FF7F50',
    relLabelBackground: '#20B2AA',
    relLabelColor: '#ffffff',

    accentColor: '#FF7F50',
    textColor: '#008080',
    glassBackground: 'rgba(255, 127, 80, 0.15)',
    glassBorder: 'rgba(0, 128, 128, 0.15)',
    
    // Branch-specific colors (Coral, teal, ocean blue, sunset yellow, orange, rose, mint)
    branchColors: ['#FF7F50', '#00A896', '#028090', '#F4A261', '#E76F51', '#F1C40F', '#48C9B0']
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon (霓虹龐克)',
    background: '#0D0E15',
    isFilledTheme: true,
    
    // Root Node
    rootBackground: '#FF007F',
    rootColor: '#ffffff',
    rootBorder: '#FF007F',

    // Sub Nodes (defaults)
    nodeDefaultBackground: '#00F5D4',
    nodeDefaultColor: '#000000',
    nodeDefaultBorder: '#00F5D4',

    // Level-specific styles
    levelBackgrounds: [
      '#FF007F', '#00F5D4', '#7B2CBF', '#CCFF00', '#151726'
    ],
    levelColors: [
      '#ffffff', '#000000', '#ffffff', '#000000', '#ffffff'
    ],
    levelBorders: [
      '#FF007F', '#00F5D4', '#7B2CBF', '#CCFF00', '#151726'
    ],

    // Lines
    lineColor: '#FF007F',

    // Relationship Lines
    relLineColor: '#FF007F',
    relLineActiveColor: '#00F5D4',
    relLabelBackground: '#7B2CBF',
    relLabelColor: '#ffffff',

    accentColor: '#00F5D4',
    textColor: '#ffffff',
    glassBackground: 'rgba(255, 0, 127, 0.15)',
    glassBorder: 'rgba(0, 245, 212, 0.15)',
    
    // Branch-specific colors (Neon pink, neon cyan, acid green, neon orange, electric purple, neon yellow, sky blue)
    branchColors: ['#FF007F', '#00F5D4', '#CCFF00', '#FF5400', '#9B5DE5', '#FFD700', '#00B4D8']
  }
];

export const DEFAULT_THEME = THEMES[0];
