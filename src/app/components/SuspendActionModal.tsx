import { useState } from "react";

interface SuspendActionModalProps {
  message: string;
  onClose: () => void;
}

/**
 * Modal affichée lorsqu'un utilisateur suspendu tente d'effectuer une action
 */
export function SuspendActionModal({ message, onClose }: SuspendActionModalProps) {
  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-yellow-600/40 bg-[#121212] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">!</span>
          <div className="text-white font-['Cinzel'] tracking-wider text-lg">Action Blocked</div>
        </div>

        <div className="border border-yellow-600/30 bg-yellow-950/20 p-4">
          <div className="text-sm text-white/80">
            {message}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="border border-white/30 px-6 py-2 text-sm text-white/80 hover:bg-white/5 hover:border-white/50 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
