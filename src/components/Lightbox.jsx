import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Fullscreen image overlay. Closes on Esc, click-outside, or × button.
// Scales small source images UP to fill the viewport so clicking always
// produces a larger view than the thumbnail.
export default function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-domain-text hover:text-eg4h-gold font-cinzel text-2xl w-10 h-10 flex items-center justify-center rounded-full border border-domain-panel-border bg-domain-bg/80"
            aria-label="Close"
          >
            ×
          </button>
          <motion.img
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            src={src}
            alt={alt}
            className="rounded-lg shadow-[0_8px_60px_rgba(0,0,0,0.8)]"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: 'min(95vw, 1600px)',
              maxHeight: '92vh',
              minWidth: 'min(90vw, 900px)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
