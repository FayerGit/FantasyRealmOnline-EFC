import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg border border-white/20 bg-[#121212] shadow-[0_0_30px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/20 p-4 text-white font-['Cinzel'] tracking-wider text-lg">
          {title}
        </div>
        <div className="p-4 text-sm text-white/80">
          {message}
        </div>
        <div className="p-4 pt-0 flex justify-end gap-2">
          <button
            onClick={onConfirm}
            className="border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 hover:border-red-500/70 transition-all"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="border border-white/30 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:border-white/50 transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
