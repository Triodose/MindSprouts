import React from 'react';
import { X } from 'lucide-react';

interface ShortcutHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Tab'], description: '新增子節點 (Child Node)' },
  { keys: ['Enter'], description: '新增兄弟節點 (Sibling Node)' },
  { keys: ['Space', '或 雙擊'], description: '編輯選取的節點文字' },
  { keys: ['Delete', 'Backspace'], description: '刪除選取的節點' },
  { keys: ['↑', '↓', '←', '→'], description: '在節點之間移動選取目標' },
  { keys: ['Ctrl', 'Z'], description: '復原 (Undo)' },
  { keys: ['Ctrl', 'Y'], description: '重做 (Redo)' },
  { keys: ['滑鼠左鍵拖曳'], description: '平移畫布空間' },
  { keys: ['滑鼠滾輪'], description: '縮放畫布比例大小' },
  { keys: ['Escape'], description: '取消選取 或 退出文字編輯模式' }
];

export const ShortcutHelper: React.FC<ShortcutHelperProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>快速鍵操作指南 💡</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="shortcut-grid">
          {SHORTCUTS.map((item, idx) => (
            <React.Fragment key={idx}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {item.keys.map((key, keyIdx) => (
                  <span key={keyIdx} className="shortcut-key">
                    {key}
                  </span>
                ))}
              </div>
              <div className="shortcut-desc">{item.description}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShortcutHelper;
