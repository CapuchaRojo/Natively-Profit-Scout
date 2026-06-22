import { useEffect, type ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = '600px' }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width, maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #2a3a5c',
          }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
