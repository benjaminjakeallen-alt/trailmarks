"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { XIcon } from "@phosphor-icons/react";

/**
 * A modal sheet: slides up from the bottom on phones (drag its handle down to
 * dismiss), a centered card on bigger screens. Escape and the scrim close it.
 * Only the handle drags: anywhere else a swipe scrolls what's in it.
 */
export default function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-fg/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 shadow-[var(--shadow-float)] ring-1 ring-line sm:max-w-[440px] sm:rounded-[2rem] sm:p-7"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            // Framer turns off native vertical panning on anything draggable; the handle
            // does the dragging, so give touch scrolling back to the rest.
            style={{ touchAction: "pan-y" }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) onClose();
            }}
          >
            <div
              className="-mx-5 -mt-3 mb-1 flex h-7 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
              onPointerDown={(e) => drag.start(e)}
              aria-hidden
            >
              <div className="h-1 w-10 rounded-full bg-fg/15" />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-fg-muted ring-1 ring-line hover:text-fg sm:right-5 sm:top-5"
            >
              <XIcon size={16} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
