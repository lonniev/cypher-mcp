// Swipe / arrow navigation between sibling dossiers — the gesture eXcalibur uses
// to page through Posts. Left swipe (or → key) goes to the next sibling; right
// swipe (or ← key) to the previous. Touch handlers attach to the dossier
// container; keyboard is global while the component is mounted.

import { useEffect, useRef } from "react";

export interface SwipeNav {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const THRESHOLD = 55; // px of horizontal travel to count as a swipe

export function useSwipeNav({ prev, next }: { prev?: () => void; next?: () => void }): SwipeNav {
  // Keep the latest callbacks without re-binding listeners every render.
  const cb = useRef({ prev, next });
  cb.current = { prev, next };

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // Don't hijack arrows while typing in a field.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight") cb.current.next?.();
      else if (e.key === "ArrowLeft") cb.current.prev?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      // Horizontal, decisive, and not a vertical scroll.
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) cb.current.next?.();
      else cb.current.prev?.();
    },
  };
}
