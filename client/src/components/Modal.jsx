import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-sm">
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-[fadeIn_.15s_ease-out] rounded-xl2 border border-line bg-white shadow-panel`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-2 text-lg leading-none" aria-label="Close">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
