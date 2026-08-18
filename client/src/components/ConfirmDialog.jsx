import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink/60">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="inline-flex items-center justify-center rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-500/90"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
