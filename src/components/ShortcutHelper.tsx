import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface ShortcutHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelper: React.FC<ShortcutHelperProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Tab'], description: t('shortcutTab') },
    { keys: ['Enter'], description: t('shortcutEnter') },
    { keys: ['Space', t('shortcutOrDblClick')], description: t('shortcutF2') },
    { keys: ['Delete', 'Backspace'], description: t('shortcutDel') },
    { keys: ['↑', '↓', '←', '→'], description: t('shortcutMove') },
    { keys: ['Ctrl', 'Z'], description: t('shortcutCtrlZ') },
    { keys: ['Ctrl', 'Y'], description: t('shortcutCtrlY') },
    { keys: [t('shortcutLeftDrag')], description: t('shortcutDrag') },
    { keys: [t('shortcutWheel')], description: t('shortcutScroll') },
    { keys: ['Escape'], description: t('shortcutEsc') }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('shortcutTitle')} 💡</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="shortcut-grid">
          {shortcuts.map((item, idx) => (
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
