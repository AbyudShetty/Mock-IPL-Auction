import { useEffect } from 'react';

/**
 * Shared shell for the auction's modals: keeps the original `.modal` markup
 * (so the CSS is untouched) and adds Escape / click-outside dismissal.
 */
export default function Modal({
  id,
  open,
  onClose,
  className = 'modal',
  contentClassName = 'modal-content',
  style,
  contentStyle,
  children
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id={id}
      className={className}
      style={{ display: 'block', ...style }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={contentClassName} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
