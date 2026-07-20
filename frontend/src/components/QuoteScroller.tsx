// Entertaining loading state — rotating quotes on factory automation, business
// efficiency, and the merits of organization, so a wait reads as "we're working"
// instead of a frozen "Loading…". The quotes live in lib/quotes.ts (inline, so
// the loader can never itself fail on a network hiccup). The optional `heading`
// doubles as a status line ("Reading the graph…").

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { QUOTES } from "../lib/quotes";

const DWELL_MS = 3500;
const FADE_MS = 450;

export default function QuoteScroller({
  heading,
  className = "",
}: {
  heading?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);
  const tick = useRef<number | undefined>(undefined);
  const fade = useRef<number | undefined>(undefined);

  useEffect(() => {
    tick.current = window.setInterval(() => {
      setVisible(false);
      fade.current = window.setTimeout(() => {
        setIndex((prev) => {
          let next = prev;
          while (next === prev) next = Math.floor(Math.random() * QUOTES.length);
          return next;
        });
        setVisible(true);
      }, FADE_MS);
    }, DWELL_MS);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
      if (fade.current) window.clearTimeout(fade.current);
    };
  }, []);

  const q = QUOTES[index];

  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${className}`}>
      <div className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em] text-amber-600 dark:text-amber-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {heading ?? "Working…"}
      </div>
      <div
        className="mx-auto flex min-h-[7rem] max-w-xl flex-col justify-center gap-3"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      >
        <p className="font-serif text-lg italic leading-relaxed text-stone-700 dark:text-zinc-300">
          <span className="text-amber-500">“</span>{q.text}<span className="text-amber-500">”</span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-stone-400 dark:text-zinc-500">
          {q.author}
        </p>
      </div>
    </div>
  );
}
